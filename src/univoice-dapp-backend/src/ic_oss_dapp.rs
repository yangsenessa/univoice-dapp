use ic_cdk::api::call::call;
use ic_cdk::api::call::call_raw128;
use ic_cdk::api::management_canister::main::CanisterId;
use candid::{CandidType};
use ic_oss_types::cose::Token;
use serde::{Serialize, Deserialize};
use serde_cbor;
use crate::Principal;

#[derive(Serialize, Deserialize)]
pub struct Policy {
    pub principal_id: String,
    pub resource: String,
    pub permissions: Vec<String>,
}

pub async fn attach_policies(cluster_id: String, principal_id: String, policies: String) -> Result<(), String> {
    let subject = Principal::from_text(principal_id).map_err(|_| "Invalid subject principal".to_string())?;
    let audience = Principal::from_text(cluster_id).map_err(|_| "Invalid audience principal".to_string())?;

    let token = Token { subject, audience, policies, };

    let (result,): (Result<(), String>,) = call(audience, "admin_attach_policies", (token,), )
        .await
        .map_err(|err| format!("Failed to call attach_policies: {:?}", err))?;

    result
}

pub async fn detach_policies(cluster_id: String, principal_id: String, policies: String) -> Result<(), String> {
    let subject = Principal::from_text(principal_id).map_err(|_| "Invalid subject principal".to_string())?;
    let audience = Principal::from_text(cluster_id).map_err(|_| "Invalid audience principal".to_string())?;

    let token = Token { subject, audience, policies, };

    let (result,): (Result<(), String>,) = call(audience, "admin_detach_policies", (token,), )
        .await
        .map_err(|err| format!("Failed to call detach_policies: {:?}", err))?;

    result
}
