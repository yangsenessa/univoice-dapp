mod buss_types;
use candid::{CandidType, Principal};

use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    storable::Bound,
    DefaultMemoryImpl, StableBTreeMap, StableCell, Storable,
};
use rand::{rngs::StdRng, RngCore, SeedableRng};
use serde::{Deserialize, Serialize};
use serde_bytes::ByteBuf;
use std::{borrow::Cow, cell::RefCell, collections::BTreeSet, time::Duration};

type Memory = VirtualMemory<DefaultMemoryImpl>;

const STATE_MEMORY_ID: MemoryId = MemoryId::new(0);
thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
}


#[ic_cdk::init]
fn init() {

}



fn is_controller() -> Result<(), String> {
    let caller = ic_cdk::caller();
    if ic_cdk::api::is_controller(&caller) {
        Ok(())
    } else {
        Err("user is not a controller".to_string())
    }
}

#[ic_cdk::update]
fn add_common_info(key: String, content: String) -> Result<(), String> {
    crate::buss_types::add_info_item(key, content)
}

#[ic_cdk::update]
fn batch_common_add_info(items: Vec<buss_types::BatchInfoItem>) -> Result<(), String> {
    crate::buss_types::batch_add_info_items(items)
}

#[ic_cdk::query]
fn get_common_info(key: String) -> Option<buss_types::CommonInfoCfg> {
    crate::buss_types::get_info_by_key(key)
}

#[ic_cdk::query]
fn batch_get_common_info(keys: Vec<String>) -> Vec<Option<buss_types::CommonInfoCfg>> {
    crate::buss_types::batch_get_info(keys)
}

#[ic_cdk::update]
fn update_common_info(key: String, content: String) -> Result<(), String> {
    crate::buss_types::update_info_item(key, content)
}



ic_cdk::export_candid!();