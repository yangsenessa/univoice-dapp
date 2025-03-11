use ic_cdk::api::call::call;
use ic_cdk::api::call::call_raw128;
use ic_cdk::api::management_canister::main::CanisterId;
use candid::{CandidType};
use ic_oss_types::cose::Token;
use serde::{Serialize, Deserialize};
use serde_cbor;
use crate::Principal;
use std::time::{SystemTime, UNIX_EPOCH};
use std::string::String;
use ic_cdk::api::time;
use serde_bytes::ByteBuf;
use base64;

#[derive(CandidType, Serialize, Deserialize, Debug)]
pub struct AccessTokenResponse {
    pub access_token: String,
    pub folder: String,
}

pub async fn attach_policies(bucket_id: String, cluster_id: String, principal_id: String, policies: String) -> Result<(), String> {
    let subject = Principal::from_text(principal_id).map_err(|_| "Invalid subject principal".to_string())?;
    let audience = Principal::from_text(bucket_id).map_err(|_| "Invalid audience principal".to_string())?;

    let token = Token { subject, audience, policies, };

    let cluster_canister_id = Principal::from_text(cluster_id).map_err(|_| "Invalid cluster principal".to_string())?;
    let (result,): (Result<(), String>,) = call(cluster_canister_id, "admin_attach_policies", (token,), )
        .await
        .map_err(|err| format!("Failed to call attach_policies: {:?}", err))?;

    result
}

pub async fn detach_policies(bucket_id: String, cluster_id: String, principal_id: String, policies: String) -> Result<(), String> {
    let subject = Principal::from_text(principal_id).map_err(|_| "Invalid subject principal".to_string())?;
    let audience = Principal::from_text(bucket_id).map_err(|_| "Invalid audience principal".to_string())?;

    let token = Token { subject, audience, policies, };

    let cluster_canister_id = Principal::from_text(cluster_id).map_err(|_| "Invalid cluster principal".to_string())?;
    let (result,): (Result<(), String>,) = call(cluster_canister_id, "admin_detach_policies", (token,), )
        .await
        .map_err(|err| format!("Failed to call detach_policies: {:?}", err))?;

    result
}

pub async fn get_access_token(wallet_principal: String, bucket_id: String, cluster_id: String) -> Result<AccessTokenResponse, String> {
    let subject = Principal::from_text(wallet_principal).map_err(|_| "Invalid subject principal".to_string())?;
    let audience = Principal::from_text(bucket_id).map_err(|_| "Invalid bucket principal".to_string())?;
    let cluster_canister = Principal::from_text(cluster_id).map_err(|_| "Invalid cluster principal".to_string())?;

    let policies = "Folder.Read:0 Folder.Write:0".to_string();
    let now_sec = time() / 1_000_000_000;
    let expiration_sec = now_sec + 3600;

    let token = Token {
        subject,
        audience,
        policies,
    };

    let (result,): (Result<ByteBuf, String>,) = call(cluster_canister, "admin_weak_access_token", (token, now_sec, expiration_sec))
        .await
        .map_err(|err| format!("Failed to call admin_weak_access_token: {:?}", err))?;

    match result {
        Ok(access_token) => {
            let access_token_str = base64::encode(access_token.as_ref());
            Ok(AccessTokenResponse {
                access_token: access_token_str,
                folder: "0/".to_string(),
            })
        }
        Err(err) => Err(err),
    }
}
