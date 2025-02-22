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


ic_cdk::export_candid!();