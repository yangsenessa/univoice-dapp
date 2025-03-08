use std::borrow::{Borrow, BorrowMut};
use candid::{CandidType, Deserialize, Nat, Principal};
use serde::Serialize;
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, Storable, StableBTreeMap, storable::Bound};
use icrc_ledger_types::icrc1::account::Account;
use icrc_ledger_types::icrc1::transfer::{BlockIndex, NumTokens, TransferArg, TransferError};
use icrc_ledger_types::icrc2::approve::{ApproveArgs, ApproveError};
use icrc_ledger_types::icrc2::transfer_from::{TransferFromArgs, TransferFromError};

use std::cell::RefCell;
use rand::Rng;
use rand::rngs::StdRng;

type Memory = VirtualMemory<DefaultMemoryImpl>;

#[derive(Clone, CandidType, Deserialize, Serialize)]
pub struct InviteCode {
    pub code: String,
    pub owner: String,  // Principal ID of code creator
    pub created_at: u64,
    pub is_used: bool,
    pub used_by: Option<String>, // Principal ID of user who used the code
}

#[derive(Clone, CandidType, Deserialize, Serialize)]
pub struct InviteRewardRecord {
    pub id: String,
    pub invite_code: String,
    pub code_owner: String,    // Principal ID of invite code owner
    pub new_user: String,      // Principal ID of new user
    pub token_amount: Nat,     // Amount of tokens to reward
    pub created_at: u64,
    pub is_claimed: bool,
    pub claimed_at: Option<u64>,
}

impl Storable for InviteCode {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        let serialized = candid::encode_one(self).expect("Failed to serialize InviteCode");
        std::borrow::Cow::Owned(serialized)
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).expect("Failed to deserialize InviteCode")
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 1024,
        is_fixed_size: false,
    };
}

impl Storable for InviteRewardRecord {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        let serialized = candid::encode_one(self).expect("Failed to serialize InviteRewardRecord");
        std::borrow::Cow::Owned(serialized)
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).expect("Failed to deserialize InviteRewardRecord")
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 2048,
        is_fixed_size: false,
    };
}

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = 
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static INVITE_CODES: RefCell<StableBTreeMap<String, InviteCode, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(2)))
        )
    );

    static REWARD_RECORDS: RefCell<StableBTreeMap<String, InviteRewardRecord, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(3)))
        )
    );
}

fn get_timestamp() -> u64 {
    ic_cdk::api::time()
}

pub fn create_invite_code(owner: String) -> Result<InviteCode, String> {
    INVITE_CODES.with(|codes| {
        let mut codes = codes.borrow_mut();
        
        // Check if invite code already exists for this owner
        if let Some(existing_code) = codes.get(&owner) {
            return Ok(existing_code);
        }

        // Generate random 6-digit code
        let mut rng = rand::thread_rng();
        let code: String = (0..6)
            .map(|_| rng.gen_range(0..10).to_string())
            .collect();

        let invite_code = InviteCode {
            code: code.clone(),
            owner: owner.clone(),
            created_at: get_timestamp(),
            is_used: false,
            used_by: None,
        };

        codes.insert(owner, invite_code.clone());
        Ok(invite_code)
    })
}

pub fn use_invite_code(code: String, new_user: String) -> Result<InviteRewardRecord, String> {
    INVITE_CODES.with(|codes| {
        let mut codes = codes.borrow_mut();
        
        // Find the invite code by iterating through all codes
        let owner_id = codes.iter()
            .find(|(_, ic)| ic.code == code)
            .map(|(owner, _)| owner.clone())
            .ok_or("Invite code not found")?;

        let mut invite_code = codes.get(&owner_id)
            .ok_or("Invite code not found")?;

        if invite_code.is_used {
            return Err("Invite code already used".to_string());
        }

        invite_code.is_used = true;
        invite_code.used_by = Some(new_user.clone());
        codes.insert(owner_id.clone(), invite_code.clone());

        let reward_id = format!("{}_{}", code, get_timestamp());
        let reward = InviteRewardRecord {
            id: reward_id.clone(),
            invite_code: code,
            code_owner: owner_id,
            new_user,
            token_amount: Nat::from(1000 as u64), // Default reward amount
            created_at: get_timestamp(),
            is_claimed: false,
            claimed_at: None,
        };

        REWARD_RECORDS.with(|records| {
            let mut records = records.borrow_mut();
            records.insert(reward_id, reward.clone());
            Ok(reward)
        })
    })
}

// pub async fn claim_reward(reward_id: String) -> Result<InviteRewardRecord, String> {
//     let (mut reward, token_canister_id) = REWARD_RECORDS.with(|records| {
//         let mut records = records.borrow_mut();
//
//         let reward = records.get(&reward_id)
//             .ok_or("Reward record not found")?;
//
//         if reward.is_claimed {
//             return Err("Reward already claimed".to_string());
//         }
//
//         let token_canister_id = Principal::from_text("bd3sg-teaaa-aaaaa-qaaba-cai").unwrap();
//         Ok((reward, token_canister_id))
//     })?;
//
//     // First transfer to new user
//     let icrc2_args = TransferFromArgs {
//         from: Account {
//             owner: ic_cdk::id(),
//             subaccount: None,
//         },
//         to: Account {
//             owner: Principal::from_text(&reward.new_user).map_err(|e| e.to_string())?,
//             subaccount: None,
//         },
//         amount: reward.token_amount.clone(),
//         fee: None,
//         memo: None,
//         created_at_time: None,
//         spender_subaccount: None,
//     };
//
//     // Check if transfer fails
//     ic_cdk::call(token_canister_id, "icrc2_transfer_from", (icrc2_args,))
//         .await
//         .map_err(|e: (ic_cdk::api::call::RejectionCode, String)| format!("Failed to transfer tokens to new user: {:?}", e))?;
//
//         // Then transfer to inviter
//         let icrc2_args = TransferFromArgs {
//             from: Account {
//                 owner: ic_cdk::id(),
//                 subaccount: None,
//             },
//             to: Account {
//                 owner: Principal::from_text(&reward.code_owner).map_err(|e| e.to_string())?,
//                 subaccount: None,
//             },
//             amount: reward.token_amount.clone(),
//             fee: None,
//             memo: None,
//             created_at_time: None,
//             spender_subaccount: None,
//         };
//
//         // Check if transfer fails
//         ic_cdk::call(token_canister_id, "icrc2_transfer_from", (icrc2_args,))
//             .await
//             .map_err(|e| format!("Failed to transfer tokens to inviter: {:?}", e))?;
//
//         reward.is_claimed = true;
//         reward.claimed_at = Some(get_timestamp());
//
//         REWARD_RECORDS.with(|records| {
//             let mut records = records.borrow_mut();
//             records.insert(reward_id, reward.clone());
//             Ok(reward)
//         })
// }

pub fn get_user_rewards(user_principal: String) -> Vec<InviteRewardRecord> {
    REWARD_RECORDS.with(|records| {
        let records = records.borrow();
        records.iter()
            .filter(|(_, record)| {
                record.code_owner == user_principal || record.new_user == user_principal
            })
            .map(|(_, record)| {
                let mut modified_record = record.clone();
                if record.code_owner == user_principal {
                    modified_record.token_amount = (record.token_amount * 30u32) / 100u32; // 30% for code owner
                } else {
                    modified_record.token_amount = (record.token_amount * 70u32) / 100u32; // 70% for new user
                }
                modified_record
            })
            .collect()
    })
}

pub fn verify_invite_code(code: String) -> Option<InviteCode> {
    INVITE_CODES.with(|codes| {
        let codes = codes.borrow();
        for (owner_id, invite_code) in codes.iter() {
            if invite_code.code == code {
            return Some(invite_code.clone());
            }
        }
        None
        })
}
