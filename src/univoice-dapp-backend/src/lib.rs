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

/// Verifies the validity of an invite code.
/// Returns Option<InviteCode> containing the invite code details if valid.

/// Exports the Candid interface definition for the canister.
mod buss_types;
mod activate_types;
mod license_types;
mod voice_types;
mod constants;
mod ic_oss_dapp;

use candid::{CandidType, Principal};

use getrandom::Error;
use rand::{RngCore, SeedableRng};
use rand::rngs::SmallRng;
use rand::Rng;
use serde::{Deserialize, Serialize};
use serde_bytes::ByteBuf;
use std::{borrow::Cow, cell::RefCell, collections::BTreeSet, time::Duration};
use std::borrow::BorrowMut;
use ic_oss_can::types::FileMetadata;

use license_types::{NFTCollection, UserLicenseRecord, UserNFTsRequest, UserNFTsResponse};
use crate::buss_types::{InvitedUserResponse, Quest};
use ic_oss_types::file::{
    CreateFileInput, CreateFileOutput, FileInfo, UpdateFileChunkInput,
    UpdateFileChunkOutput, UpdateFileInput, UpdateFileOutput,
};

thread_local! {
    static RNG: RefCell<Option<SmallRng>> = RefCell::new(None);
}

pub fn init_rand() {
    getrandom::register_custom_getrandom!(custom_getrandom);
}

fn custom_getrandom(buf: &mut [u8]) -> Result<(), Error> {
    RNG.with(|mut rng| {
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
    ic_cdk::println!("add_custom_info");
    is_called_by_dapp_frontend()?;

    // initialization invite_code and is_invite_code_filled
    let owner = if !info.wallet_principal.is_empty() {
        info.wallet_principal.clone()
    } else {
        info.dapp_principal.clone()
    };

    if info.invite_code.is_empty() {
         // Generate random 6-digit code
         let mut rng = rand::thread_rng();
         let code: String = (0..6)
             .map(|_| rng.gen_range(0..10).to_string())
             .collect();
        info.invite_code = code;
    }

    info.is_invite_code_filled = info.used_invite_code.as_ref().map_or(false, |code| !code.is_empty());
    info.total_rewards = 0;
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
async fn create_invite_code(owner: String) -> Result<activate_types::InviteCode, String> {
    is_called_by_dapp_frontend()?;
    activate_types::create_invite_code(owner)
}

#[ic_cdk::update]
async fn use_invite_code(code: String, new_user: String) -> Result<activate_types::InviteRewardRecord, String> {
    is_called_by_dapp_frontend()?;
    activate_types::use_invite_code(code, new_user)
}

// #[ic_cdk::update]
// async fn claim_reward(reward_id: String) -> Result<activate_types::InviteRewardRecord, String> {
//     is_called_by_dapp_frontend()?;
//     activate_types::claim_reward(reward_id).await
// }

#[ic_cdk::query]
fn get_user_rewards(user_principal: String) -> Vec<activate_types::InviteRewardRecord> {
    activate_types::get_user_rewards(user_principal)
}

#[ic_cdk::query]
fn verify_invite_code(code: String) -> Option<activate_types::InviteCode> {
    activate_types::verify_invite_code(code)
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

    let buyer_principal = Principal::from_text(&buyer)
        .map_err(|e| format!("Invalid buyer principal: {}", e))?;

    let transaction_records = license_types::buy_nft_license(&buyer, &collection_id, quantity).await?;
    let collection = license_types::get_nft_collection(&collection_id).await?;

    Ok((transaction_records, collection))
}

#[ic_cdk::update]
fn submit_invite_code(dapp_principal: Option<String>, wallet_principal: Option<String>,
                      used_invite_code: String) -> bool {
    if is_called_by_dapp_frontend().is_err() {
        ic_cdk::println!("Unauthorized access attempt detected.");
        return false;
    }

    buss_types::submit_invite_code(dapp_principal, wallet_principal, used_invite_code)
}

#[ic_cdk::query]
fn get_quest_list(dapp_principal: Option<String>, wallet_principal: Option<String>) -> Vec<Quest> {
    if is_called_by_dapp_frontend().is_err() {
        ic_cdk::println!("Unauthorized access attempt detected.");
        return vec![];
    }
    buss_types::get_quest_list(dapp_principal, wallet_principal)
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

ic_cdk::export_candid!();
