use candid::{CandidType, Principal, Nat};
use serde::{Deserialize, Serialize};
use icrc_ledger_types::icrc1::account::Account;
use icrc_ledger_types::icrc1::transfer::{BlockIndex, NumTokens, TransferArg, TransferError};
use icrc_ledger_types::{
    icrc2::transfer_from::{TransferFromArgs, TransferFromError},
};
use icrc_ledger_types::icrc::generic_metadata_value::MetadataValue;
use crate::buss_types::get_info_by_key;

type TransferResult = Result<Nat, TransferError>;
type Account__1 = Account;
type TransferArgs = TransferArg;


#[derive(CandidType, Debug, Clone, Deserialize)]
pub struct Account__3 {
    pub owner: Principal,
    pub subaccount: Option<Vec<u8>>,
}

#[derive(CandidType, Debug, Clone, Deserialize)]
pub struct Icrc37_TransferFromArg {
    pub token_id: Nat,
    pub from: Account__3,
    pub to: Account__3,
    pub spender_subaccount: Option<Vec<u8>>,
    pub memo: Option<Vec<u8>>,
    pub created_at_time: Option<u64>,
}

type TransferFromResult = Result<Nat, TransferError>;


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NFTCollection {
    pub name: String,
    pub symbol: String,
    pub description: Option<String>,
    pub logo: Option<String>,
    pub supply_cap: Option<u128>,
    pub total_supply: u128,
    pub owner: Principal,
    pub allowed_transfers: bool,
    pub expired_at: Option<u64>
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserNFTHolding {
    pub owner: Principal,
    pub nft_colletion_id:String,
    pub token_ids: Vec<u128>,
    pub expired_at: Option<u64>,
}
impl UserNFTHolding {
    pub async fn total_nft_supply(nft_collection_id: &String) -> Result<Nat, String> {
        ic_cdk::call::<(), (Nat,)>(
            Principal::from_text(nft_collection_id).expect("Could not decode the principal."),
            "icrc7_total_supply",
            (),
        )
        .await
        .map_err(|e| format!("failed to call ledger: {:?}", e))
        .map(|r| r.0)
    }
}
impl UserNFTHolding {
    async fn init_nft_tokens(nft_collection_id:String) -> Vec<Vec<Nat>> {
        let mut tokens_shard: Vec<Nat> = Vec::new();
        let mut nft_tokens_param: Vec<Vec<Nat>> = Vec::new();
        let max_tokenid: Nat = Self::total_nft_supply(&nft_collection_id).await.expect("Failed to get total NFT supply");
        ic_cdk::println!("Total Nft Supply is {}", &max_tokenid);
    
        let mut i: u128 = 0 as u128;
        let mut i_shard: u128 = 0 as u128;
    
        let glb_shard_size = 50;
        loop {
            tokens_shard.push(Nat::from(i.clone()));
            i += 1;
            i_shard += 1;
    
            if Nat::from(i_shard).eq(&Nat::from(glb_shard_size as u128)) {
                nft_tokens_param.push(tokens_shard.clone());
                tokens_shard.clear();
                i_shard = 0;
                ic_cdk::println!("Init Nft shard to Index of {}", i);
            }
    
            if Nat::from(i) == max_tokenid {
                break;
            }
        }
        if tokens_shard.len() > 0 {
            nft_tokens_param.push(tokens_shard.clone());
            tokens_shard.clear();
        }
        return nft_tokens_param;
    }
}


impl UserNFTHolding {
    pub async fn construct_user_nft_holding(
        owner: Principal,
        nft_canister_key: &str,
    ) -> Result<Self, String> {
        // Get NFT canister id from CommonInfoCfg
        let nft_canister = match get_info_by_key(nft_canister_key.to_string()) {
            Some(info) => info.content,
            None => return Err("NFT canister configuration not found".to_string()),
        };

        // Call icrc7_owner_of on the NFT canister
        // Get all token IDs from init_nft_tokens
        let token_shards = Self::init_nft_tokens(nft_canister.clone()).await;
        let mut owned_token_ids: Vec<Nat> = Vec::new();
        
        for shard in token_shards {
            let accounts = ic_cdk::call::<(Vec<Nat>,), (Vec<Option<Account>>,)>(
            Principal::from_text(&nft_canister).expect("Could not decode the principal."),
            "icrc7_owner_of",
            (shard.clone(),),
            )
            .await
            .map_err(|e| format!("failed to call ledger: {:?}", e))?
            .0;

            // Check ownership for each token in the shard
            for (token_id, account) in shard.iter().zip(accounts.iter()) {
            if let Some(acc) = account {
                if acc.owner == owner {
                owned_token_ids.push(token_id.clone());
                }
            }
            }
        }

        let token_ids = vec![owned_token_ids];

        let token_ids: Vec<u128> = token_ids.into_iter()
            .flatten()
            .map(|n| n.0.try_into().unwrap())
            .collect();

        Ok(Self {
            owner,
            nft_colletion_id: nft_canister,
            token_ids,
            expired_at: get_info_by_key("nft_expired_at".to_string()).map(|info| 
                info.content.parse::<u64>().unwrap_or(0)
            ),
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserLicenseRecord {
    pub owner: String,
    pub nft_collection_id: String,
    pub license_name: String,
    pub token_id: u128,
    pub purchase_time: u64,
    pub expired_at: Option<u64>,
}
impl UserLicenseRecord {
    pub async fn new(
        owner: String,
        nft_collection_id: String,
        license_name: String,
        token_id: u128,
    ) -> Result<Self, String> {
        let now = ic_cdk::api::time();
        let seconds_now = now / 1_000_000_000;

        // Get platform token receive account from CommonInfoCfg
        let platform_account = get_info_by_key("platform_token_account".to_string())
            .ok_or("Platform token account not found")?;

        // Get license price from CommonInfoCfg
        let license_price = get_info_by_key(format!("{}_price", nft_collection_id))
            .map(|info| info.content.parse::<u64>().unwrap_or(0))
            .ok_or("License price not found")?;

        // Transfer ICP tokens to platform account
        let transfer_args = TransferArg {
            from_subaccount: None,
            to: Account {
            owner: Principal::from_text(&platform_account.content)
                .map_err(|e| format!("Invalid platform principal: {}", e))?,
            subaccount: None,
            },
            amount: Nat::from(license_price),
            fee: None,
            memo: Some(Vec::from("Get license").into()),
            created_at_time: Some(ic_cdk::api::time()),
        };

        // Call ICP ledger for token transfer
        ic_cdk::call::<(TransferArg,), (Result<Nat, TransferError>,)>(
            Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(), // ICP ledger canister
            "icrc1_transfer",
            (transfer_args,),
        )
        .await
        .map_err(|e| format!("Failed to transfer ICP: {:?}", e))?
        .0
        .map_err(|e| format!("Transfer error: {:?}", e))?;

        // Transfer NFT using icrc37_transfer_from
        let transfer_args = Icrc37_TransferFromArg {
            token_id: Nat::from(token_id),
            from: Account__3 {
            owner: Principal::from_text(&nft_collection_id)
                .map_err(|e| format!("Invalid NFT collection principal: {}", e))?,
            subaccount: None,
            },
            to: Account__3 {
            owner: Principal::from_text(&owner)
                .map_err(|e| format!("Invalid owner principal: {}", e))?,
            subaccount: None,
            },
            spender_subaccount: None,
            memo: None,
            created_at_time: None,
        };

        // The candid shows icrc37_transfer_from accepts vec of TransferFromArg and returns vec of opt TransferFromResult
        ic_cdk::call::<(Vec<Icrc37_TransferFromArg>,), (Vec<Option<TransferFromResult>>,)>(
            Principal::from_text(&nft_collection_id)
            .map_err(|e| format!("Invalid NFT collection principal: {}", e))?,
            "icrc37_transfer_from", 
            (vec![transfer_args],),
        )
        .await
        .map_err(|e| format!("Failed to transfer NFT: {:?}", e))?
        .0
        .get(0)
        .ok_or("No transfer result returned")?
        .as_ref()
        .ok_or("Transfer failed")?;


        // Set expiration
        let expired_duration_key = format!("{}_expired_duration", nft_collection_id);
        let expired_duration = get_info_by_key(expired_duration_key)
            .map(|info| info.content.parse::<u64>().unwrap_or(0))
            .ok_or(format!("License expiration duration not found for {}", nft_collection_id))?;

        let expired_at = Some(seconds_now + expired_duration);

        Ok(Self {
            owner,
            nft_collection_id,
            license_name,
            token_id,
            purchase_time: seconds_now,
            expired_at
        })
    }
}


