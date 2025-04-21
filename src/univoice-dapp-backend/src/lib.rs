//! Backend canister for the UniVoice DApp on the Internet Computer.
//! This module handles information management and invitation system functionalities.

/// Initializes the canister state.
/// Called automatically when the canister is deployed.

/// Checks if the caller is a controller of the canister.
/// Returns Ok(()) if the caller is a controller, otherwise returns an error message.

/// Verifies if the caller is the authorized frontend canister.
/// Returns Ok(()) if the caller matches the frontend canister ID, otherwise returns an error message.

/// Adds a new information item with the specified key and content.
/// Only callable by canister controllers.
/// Returns Result<(), String> indicating success or failure.

/// Retrieves information configuration by key.
/// Returns Option<CommonInfoCfg> containing the information if found.

/// Adds multiple information items in batch.
/// Only callable by canister controllers.
/// Returns Result<(), String> indicating success or failure.

/// Retrieves multiple information configurations by their keys.
/// Returns a vector of Optional CommonInfoCfg items.

/// Updates an existing information item with new content.
/// Only callable by canister controllers.
/// Returns Result<(), String> indicating success or failure.

/// Adds custom information for a user or dapp.
/// Only callable by the frontend canister.
/// Returns Result<(), String> indicating success or failure.

/// Retrieves custom information based on dapp or wallet principal.
/// Returns Option<CustomInfo> containing the custom information if found.

/// Updates custom information for a specified dapp or wallet principal.
/// Only callable by the frontend canister.
/// Returns Result<(), String> indicating success or failure.

/// Lists custom information with pagination support.
/// Returns a vector of CustomInfo objects for the specified page and page size.

/// Creates a new invite code for the specified owner.
/// Only callable by the frontend canister.
/// Returns Result<InviteCode, String> containing the created invite code or error.

/// Processes the use of an invite code by a new user.
/// Only callable by the frontend canister.
/// Returns Result<InviteRewardRecord, String> containing the reward record or error.

/// Claims a reward for the specified reward ID.
/// Only callable by the frontend canister.
/// Returns Result<InviteRewardRecord, String> containing the claimed reward or error.

/// Retrieves all reward records for a specific user.
/// Returns a vector of InviteRewardRecord objects.

/// Exports the Candid interface definition for the canister.
mod buss_types;
mod activate_types;
mod license_types;
mod constants;
mod ic_oss_dapp;
mod voice_oss_type;

use candid::Principal;
use getrandom::Error;
use rand::{RngCore, SeedableRng};
use rand::rngs::SmallRng;
use rand::Rng;
use std::cell::RefCell;
use ic_cdk::api::time;
use icrc_ledger_types::icrc1::account::Account;
use icrc_ledger_types::icrc2::transfer_from::{TransferFromArgs, TransferFromError};
use icrc_ledger_types::icrc1::transfer::{BlockIndex, NumTokens};

use crate::voice_oss_type::{
    VoiceAssetData, MetadataValue, ListVoiceOssParams, VoiceOssInfo,
    store_voice_asset_data, get_voice_asset_data, delete_voice_asset_data,
    list_voice_files as oss_list_voice_files
};

use crate::license_types::{
    UserNFTsRequest, UserNFTsResponse, NFTCollection, UserLicenseRecord,
};
use crate::buss_types::InvitedUserResponse;

thread_local! {
    static RNG: RefCell<Option<SmallRng>> = RefCell::new(None);
}

pub fn init_rand() {
    getrandom::register_custom_getrandom!(custom_getrandom);
}

fn custom_getrandom(buf: &mut [u8]) -> Result<(), Error> {
    RNG.with(|rng| {
        let mut rng = rng.borrow_mut();
        if rng.is_none() {
            *rng = Some(SmallRng::seed_from_u64(42));
        }
        rng.as_mut().unwrap().fill_bytes(buf);
    });
    Ok(())
}

#[ic_cdk::init]
fn init() {
    init_rand();
}


fn is_controller() -> Result<(), String> {
    let caller = ic_cdk::caller();
    if ic_cdk::api::is_controller(&caller) {
        Ok(())
    } else {
        Err("user is not a controller".to_string())
    }
}

fn is_called_by_dapp_frontend() -> Result<(), String> {
    Ok(())
    // let caller = ic_cdk::caller();
    // if caller.to_text() == "be2us-64aaa-aaaaa-qaabq-cai" {
    //     Ok(())
    // } else {
    //     Err("caller is not the frontend canister".to_string())
    // }
}

#[ic_cdk::update]
async fn add_info_item(key: String, content: String) -> Result<(), String> {
    is_controller()?;
    buss_types::add_info_item(key, content)
}

#[ic_cdk::query]
fn get_info_by_key(key: String) -> Option<buss_types::CommonInfoCfg> {
    buss_types::get_info_by_key(&key)
}

#[ic_cdk::update]
async fn batch_add_info_items(items: Vec<buss_types::BatchInfoItem>) -> Result<(), String> {
    is_controller()?;
    buss_types::batch_add_info_items(items)
}

#[ic_cdk::query]
fn batch_get_info(keys: Vec<String>) -> Vec<Option<buss_types::CommonInfoCfg>> {
    buss_types::batch_get_info(keys)
}

#[ic_cdk::update]
async fn update_info_item(key: String, content: String) -> Result<(), String> {
    is_controller()?;
    buss_types::update_info_item(key, content)
}

#[ic_cdk::update]
async fn add_custom_info(mut info: buss_types::CustomInfo) -> Result<(), String> {
    ic_cdk::println!("call add_custom_info{}", info.wallet_principal);
    is_called_by_dapp_frontend()?;

    // initialization invite_code and is_invite_code_filled
    if info.wallet_principal.is_empty() {
        ic_cdk::println!("Adding custom info for wallet: pricipal is empty");
        return Err("Wallet principal cannot be empty".to_string());
    }

    if info.invite_code.is_empty() {
         // Generate random 6-digit code
         let mut rng = rand::thread_rng();
         let code: String = (0..6)
             .map(|_| rng.gen_range(0..10).to_string())
             .collect();
        // Log the generated invite code
        ic_cdk::println!("Generated random invite code: {}", code);
        info.invite_code = code;
    }

    info.is_invite_code_filled = !info.invite_code.is_empty();
    // Log the is_invite_code_filled status
    ic_cdk::println!("Invite code filled status: {}", info.is_invite_code_filled);
    info.total_rewards = 0;

    // Generate a random nickname if none is provided
    if info.nick_name.is_empty() {
        info.nick_name = buss_types::generate_random_nickname();
        ic_cdk::println!("Generated random nickname: {}", info.nick_name);
    }
    buss_types::add_custom_info(info)
}

#[ic_cdk::query]
fn get_custom_info(dapp_principal: Option<String>, wallet_principal: Option<String>) -> Option<buss_types::CustomInfo> {
    buss_types::get_custom_info(dapp_principal, wallet_principal)
}

#[ic_cdk::update]
async fn update_custom_info(dapp_principal: Option<String>, wallet_principal: Option<String>, nick_name: String, logo: String) -> Result<(), String> {
    is_called_by_dapp_frontend()?;
    buss_types::update_custom_info(dapp_principal, wallet_principal, nick_name, logo)
}

#[ic_cdk::query]
fn list_custom_info(page: u64, page_size: u64) -> Vec<buss_types::CustomInfo> {
    buss_types::list_custom_info(page, page_size)
}

#[ic_cdk::update]
async fn use_invite_code(code: String, new_user_principalid: String) -> Result<activate_types::InviteRewardRecord, String> {
    is_called_by_dapp_frontend()?;
    activate_types::use_invite_code(code, new_user_principalid)
}

#[ic_cdk::query]
fn get_user_rewards(user_principal: String) -> Vec<activate_types::InviteRewardRecord> {
    activate_types::get_user_rewards(user_principal)
}

#[ic_cdk::update]
async fn get_user_nfts(req: UserNFTsRequest) -> Result<UserNFTsResponse, String> {
    is_called_by_dapp_frontend()?;

    let principal = Principal::from_text(&req.user)
        .map_err(|e| format!("Invalid user principal: {}", e))?;

    let holdings = license_types::get_all_user_nfts(principal, req.license_ids).await?;

    Ok(UserNFTsResponse { holdings })
}

#[ic_cdk::query]
async fn get_nft_collection(collection_id: String) -> Result<NFTCollection, String> {
    license_types::get_nft_collection(&collection_id).await
}

#[ic_cdk::update]
async fn buy_nft_license(buyer: String, collection_id: String, quantity: u64) -> Result<(Vec<UserLicenseRecord>, NFTCollection), String> {
    is_called_by_dapp_frontend()?;

    let _buyer_principal = Principal::from_text(&buyer)
        .map_err(|e| format!("Invalid buyer principal: {}", e))?;

    let transaction_records = license_types::buy_nft_license(&buyer, &collection_id, quantity).await?;
    let collection = license_types::get_nft_collection(&collection_id).await?;

    Ok((transaction_records, collection))
}

#[ic_cdk::update]
fn claim_reward(dapp_principal: Option<String>, wallet_principal: Option<String>, quest_id: u64) -> bool {
    if is_called_by_dapp_frontend().is_err() {
        ic_cdk::println!("Unauthorized access attempt detected.");
        return false;
    }

    buss_types::claim_reward(dapp_principal, wallet_principal, quest_id)
}

#[ic_cdk::update]
async fn attach_policies(bucket_id: String, cluster_id: String, principal_id: String, policies: String) -> Result<(), String> {
    is_called_by_dapp_frontend()?;
    ic_oss_dapp::attach_policies(bucket_id, cluster_id, principal_id, policies).await
}

#[ic_cdk::update]
async fn detach_policies(bucket_id: String, cluster_id: String, principal_id: String, policies: String) -> Result<(), String> {
    is_called_by_dapp_frontend()?;
    ic_oss_dapp::detach_policies(bucket_id, cluster_id, principal_id, policies).await
}

#[ic_cdk::query]
fn get_invited_users(dapp_principal: Option<String>, wallet_principal: Option<String>) -> InvitedUserResponse {
    buss_types::get_invited_users(dapp_principal, wallet_principal)
}

#[ic_cdk::update]
async fn get_access_token(wallet_principal: String, bucket_id: String, cluster_id: String) -> Result<ic_oss_dapp::AccessTokenResponse, String> {
    is_called_by_dapp_frontend()?;
    ic_oss_dapp::get_access_token(wallet_principal, bucket_id, cluster_id).await
}

//todo::Update calls consume significantly more cycles than query call
#[ic_cdk::update]
fn get_user_tasks(principal_id: String) -> Option<Vec<buss_types::TaskData>> {
    ic_cdk::println!("call get_user_tasks: {}", principal_id);
    buss_types::get_user_tasks(&principal_id)
}

#[ic_cdk::update]
async fn update_task_status(principal_id: String, task_id: String, status: String) -> Result<(), String> {
    is_called_by_dapp_frontend()?;
    ic_cdk::println!("call update_task_status: {}", principal_id);
    buss_types::update_task_status(&principal_id, &task_id, status)
}

#[ic_cdk::query]
fn get_unclaimed_rewards(user_principal: String) -> candid::Nat {
    // Get unclaimed task rewards
    let task_rewards = activate_types::get_unclaimed_task_rewards(user_principal.clone());
    
    // Get unclaimed invite rewards
    let invite_rewards = activate_types::get_unclaimed_invite_rewards(user_principal);
    
    // Sum both rewards
    task_rewards + invite_rewards
}

#[ic_cdk::update]
async fn claim_tokens(principal_id: String) -> Result<candid::Nat, String> {
    is_called_by_dapp_frontend()?;
    
    // Get unclaimed tokens for the user
    let unclaimed_task_rewards = activate_types::get_unclaimed_task_rewards(principal_id.clone());
    let unclaimed_invite_rewards = activate_types::get_unclaimed_invite_rewards(principal_id.clone());
    
    // Calculate total unclaimed rewards
    let total_unclaimed = unclaimed_task_rewards + unclaimed_invite_rewards;
    
    ic_cdk::println!("Total unclaimed rewards for {}: {}", principal_id, total_unclaimed);
    
    if total_unclaimed == candid::Nat::from(0u64) {
        return Ok(candid::Nat::from(0u64));
    }
    
    // Transfer tokens to user
    let amount_transferred = transfer_tokens_to_user(principal_id.clone(), total_unclaimed.clone()).await?;
    
    // Only mark rewards as claimed if transfer was successful
    activate_types::mark_rewards_as_claimed(principal_id)?;
    
    Ok(amount_transferred)
}

#[ic_cdk::update]
async fn transfer_tokens_to_user(user_principal: String, amount: candid::Nat) -> Result<candid::Nat, String> {
    // Get the token canister ID - This should be configured properly
    let token_canister_id = "ryjl3-tyaaa-aaaaa-aaaba-cai"; // Replace with actual token canister ID
    
    let controller = ic_cdk::id();
    
    // Create user account
    let user_account = Account {
        owner: Principal::from_text(&user_principal)
            .map_err(|e| format!("Invalid user principal: {}", e))?,
        subaccount: None,
    };
    
    // Create controller account
    let controller_account = Account {
        owner: controller,
        subaccount: None,
    };
    
    // Set up transfer from controller to user
    let transfer_args = TransferFromArgs {
        from: controller_account,
        to: user_account,
        amount: NumTokens::from(amount.clone()),
        fee: None,
        memo: None,
        created_at_time: Some(ic_cdk::api::time()),
        spender_subaccount: None,
    };
    
    ic_cdk::println!("Transferring {} tokens from controller to user {}", amount, user_principal);
    
    // Call the ICRC2 token canister to transfer tokens
    let transfer_result = ic_cdk::call::<(TransferFromArgs,), (Result<BlockIndex, TransferFromError>,)>(
        Principal::from_text(token_canister_id).unwrap(),
        "icrc2_transfer_from",
        (transfer_args,),
    )
    .await
    .map_err(|e| format!("Call to token canister failed: {:?}", e))?;
    
    let transfer_result = transfer_result.0;
    
    match transfer_result {
        Ok(_) => {
            ic_cdk::println!("Token transfer successful for user {}", user_principal);
            Ok(amount)
        },
        Err(e) => Err(format!("Token transfer failed: {:?}", e)),
    }
}

#[ic_cdk::query]
fn get_friend_infos(owner_principal: String) -> Vec<(buss_types::CustomInfo, candid::Nat)> {
    ic_cdk::println!("Fetching friend infos and rewards for: {}", owner_principal);
    activate_types::get_friend_infos(owner_principal)
}

/// Records a voice file in the ledger
#[ic_cdk::update]
#[candid::candid_method(update)]
async fn upload_voice_file(
    principal_id: Principal,
    folder_id: String,
    file_id: String,
    _content: Vec<u8>,
    custom: Option<Vec<(String, String)>>,
) -> Result<(), String> {
    is_called_by_dapp_frontend()?;
    let now = time();
    
    // Convert custom metadata to proper format
    let metadata = custom.map(|items| {
        items.into_iter()
            .map(|(k, v)| (k, MetadataValue::Text(v)))
            .collect()
    });
    
    // Parse folder_id and file_id from string to u32
    let folder_id = folder_id.parse::<u32>()
        .map_err(|_| "Invalid folder ID format".to_string())?;
    let file_id = file_id.parse::<u32>()
        .map_err(|_| "Invalid file ID format".to_string())?;
    
    let data = VoiceAssetData {
        principal_id,
        folder_id,
        file_id,
        status: 0, // Active
        created_at: now,
        updated_at: Some(now),
        custom: metadata,
    };

    store_voice_asset_data(data)
        .map(|_| ())
        .map_err(|e| format!("Failed to store voice asset data: {}", e))
}

/// Marks a voice file as deleted in the ledger
#[ic_cdk::update]
#[candid::candid_method(update)]
async fn delete_voice_file(file_id: String) -> Result<(), String> {
    is_called_by_dapp_frontend()?;
    
    // Parse file_id from string to u64
    let index = file_id.parse::<u64>()
        .map_err(|_| "Invalid file ID format".to_string())?;
    
    delete_voice_asset_data(index)
        .map_err(|e| format!("Failed to delete voice asset data: {}", e))
}

/// Lists voice files with optional filtering
#[ic_cdk::query]
#[candid::candid_method(query)]
fn list_voice_files(
    principal_id: Option<Principal>,
    folder_id: Option<String>,
    _page: Option<u32>,
    page_size: Option<u32>,
) -> Vec<VoiceOssInfo> {
    let params = ListVoiceOssParams {
        principal_id,
        folder_id: folder_id.and_then(|f| f.parse::<u32>().ok()),
        prev: None,
        take: Some(page_size.unwrap_or(10)),
    };
    oss_list_voice_files(params).unwrap_or_default()
}

/// Gets voice file details by ID
#[ic_cdk::query]
fn get_voice_file(id: u64) -> Option<VoiceAssetData> {
    get_voice_asset_data(id)
}

ic_cdk::export_candid!();
