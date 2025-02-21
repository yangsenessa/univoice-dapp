use candid::{CandidType, Principal};
use ciborium::{from_reader, into_writer};
use getrandom::register_custom_getrandom;
use ic_oss_can::types::{Chunk, FileId};
use ic_oss_types::file::*;
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
const FS_DATA_MEMORY_ID: MemoryId = MemoryId::new(1);

thread_local! {
    static RNG: RefCell<Option<StdRng>> = const { RefCell::new(None) };
    static STATE: RefCell<State> = RefCell::new(State::default());
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static STATE_STORE: RefCell<StableCell<State, Memory>> = RefCell::new(
        StableCell::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(STATE_MEMORY_ID)),
            State::default()
        ).expect("failed to init STATE_STORE")
    );

    static FS_CHUNKS_STORE: RefCell<StableBTreeMap<FileId, Chunk, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with_borrow(|m| m.get(FS_DATA_MEMORY_ID)),
        )
    );
}

ic_oss_can::ic_oss_fs!();

async fn set_rand() {
    let (rr,) = ic_cdk::api::management_canister::main::raw_rand()
        .await
        .expect("failed to get random bytes");
    let mut seed = [0u8; 32];
    seed.copy_from_slice(&rr);
    RNG.with(|rng| {
        *rng.borrow_mut() = Some(StdRng::from_seed(seed));
    });
}

fn custom_getrandom(buf: &mut [u8]) -> Result<(), getrandom::Error> {
    RNG.with(|rng| rng.borrow_mut().as_mut().unwrap().fill_bytes(buf));
    Ok(())
}

pub fn init_rand() {
    ic_cdk_timers::set_timer(Duration::from_secs(0), || ic_cdk::spawn(set_rand()));
    register_custom_getrandom!(custom_getrandom);
}

#[derive(CandidType, Clone, Default, Deserialize, Serialize)]
pub struct State {
    pub total_files: u64,
}

impl Storable for State {
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        let mut buf = vec![];
        into_writer(self, &mut buf).expect("failed to encode State");
        Cow::Owned(buf)
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        from_reader(&bytes[..]).expect("failed to decode State")
    }
}

#[ic_cdk::init]
fn init() {
    init_rand();
}

#[ic_cdk::pre_upgrade]
fn pre_upgrade() {
    STATE_STORE.with(|r| {
        STATE.with(|h| {
            r.borrow_mut()
                .set(h.borrow().clone())
                .expect("failed to save state");
        });
    });
    fs::save();
}

#[ic_cdk::post_upgrade]
fn post_upgrade() {
    init_rand();
    STATE_STORE.with(|r| {
        STATE.with(|h| {
            *h.borrow_mut() = r.borrow().get().clone();
        });
    });
    fs::load();
}

#[ic_cdk::update]
async fn upload_file(file_data: Vec<u8>) -> Result<FileId, String> {
    let file_id = fs::upload_chunks(file_data).await?;
    STATE.with(|state| {
        state.borrow_mut().total_files += 1;
    });
    Ok(file_id)
}

#[ic_cdk::query]
fn download_file(file_id: FileId) -> Result<Vec<u8>, String> {
    let file_data = fs::get_full_chunks(file_id)?;
    Ok(file_data)
}

#[ic_cdk::update]
fn delete_file(file_id: FileId) -> Result<(), String> {
    fs::delete_file(file_id)
}

#[ic_cdk::query]
fn total_files() -> u64 {
    STATE.with(|state| state.borrow().total_files)
}

#[ic_cdk::update]
fn set_file_visibility(file_id: FileId, visibility: u8) -> Result<(), String> {
    fs::set_visibility(visibility)
}

fn is_controller() -> Result<(), String> {
    let caller = ic_cdk::caller();
    if ic_cdk::api::is_controller(&caller) {
        Ok(())
    } else {
        Err("Caller is not the controller.".to_string())
    }
}

ic_cdk::export_candid!();
