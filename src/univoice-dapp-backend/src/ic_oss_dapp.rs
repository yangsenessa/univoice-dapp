use ic_cdk::api::call::call_raw128;
use ic_cdk::api::management_canister::main::CanisterId;
use candid::{CandidType};
use serde::{Serialize, Deserialize};
use serde_cbor;

#[derive(Serialize, Deserialize)]
pub struct Policy {
    pub principal_id: String,
    pub resource: String,
    pub permissions: Vec<String>,
}

pub async fn attach_policy(cluster_id: String, principal_id: String, resource: String) -> Result<(), String> {
    let policy = Policy { principal_id: principal_id.to_string(), resource: resource.to_string(),
        permissions: vec!["read".to_string(), "write".to_string()] };

    let payload = serde_cbor::to_vec(&policy).map_err(|e| format!("Serialization error: {:?}", e))?;

    let canister_id = CanisterId::from_text(cluster_id)
        .map_err(|_| "Invalid IC-OSS Cluster Canister ID".to_string())?;

    let method_name = "attach_policy";

    match call_raw128(canister_id, method_name, payload, 0).await {
        Ok(_) => Ok(()),
        Err(err) => Err(format!("Failed to attach policy: {:?}", err)),
    }
}

pub async fn detach_policy(cluster_id: String, principal_id: String, resource: String) -> Result<(), String> {
    let policy = Policy { principal_id: principal_id.to_string(), resource: resource.to_string(),
        permissions: vec!["read".to_string(), "write".to_string()] };

    let payload = serde_cbor::to_vec(&policy).map_err(|e| format!("Serialization error: {:?}", e))?;

    let canister_id = CanisterId::from_text(cluster_id)
        .map_err(|_| "Invalid IC-OSS Cluster Canister ID".to_string())?;

    let method_name = "detach_policy";

    match call_raw128(canister_id, method_name, payload, 0).await {
        Ok(_) => Ok(()),
        Err(err) => Err(format!("Failed to detach policy: {:?}", err)),
    }
}
