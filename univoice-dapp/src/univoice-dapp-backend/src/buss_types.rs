use candid::{CandidType, Deserialize};
use serde::Serialize;
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager,VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, Storable, StableBTreeMap, storable::Bound};
use std::cell::RefCell;

type Memory = VirtualMemory<DefaultMemoryImpl>;

#[derive(Clone, CandidType, Deserialize, Serialize)]
pub struct CommonInfoCfg {
    pub key: String,     // Unique identifier for the common info configuration
    pub content: String,
    pub version: String,
    pub isvalid: bool,
}
impl Storable for CommonInfoCfg {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        let serialized = candid::encode_one(self).expect("Failed to serialize CommonInfoCfg");
        std::borrow::Cow::Owned(serialized)
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).expect("Failed to deserialize CommonInfoCfg")
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 4096,
        is_fixed_size: false,
    };
}

impl CommonInfoCfg {
    pub fn create_info(key: String, content: String) -> Self {
        CommonInfoCfg {
            key,
            content,
            version: "1.0.0".to_string(), // Start with initial version
            isvalid: true,
        }
    }

    pub fn check_validity(&self) -> bool {
        self.isvalid
    }

    
    pub fn get_info_version(&self) -> &str {
        &self.version
    }

    pub fn get_info_content(&self) -> &str {
        &self.content
    }

    pub fn update_info(&mut self, content: String) {
        self.content = content;
        // Increment version (assuming semantic versioning)
        let mut version_parts: Vec<u32> = self
            .version
            .split('.')
            .map(|s| s.parse().unwrap_or(0))
            .collect();
        version_parts[2] += 1; // Increment patch version
        self.version = version_parts
            .iter()
            .map(|n| n.to_string())
            .collect::<Vec<String>>()
            .join(".");
    }

    pub fn mark_as_invalid(&mut self) {
        self.isvalid = false;
    }

    // Compare versions (helper function)
    fn compare_versions(v1: &str, v2: &str) -> std::cmp::Ordering {
        let v1_parts: Vec<u32> = v1.split('.').map(|s| s.parse().unwrap_or(0)).collect();
        let v2_parts: Vec<u32> = v2.split('.').map(|s| s.parse().unwrap_or(0)).collect();
        v1_parts.cmp(&v2_parts)
    }
}


thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = 
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static COMMON_INFO_SET: RefCell<StableBTreeMap<String, CommonInfoCfg, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)))
        )
    );
}



pub fn add_info_item(key: String, content: String) -> Result<(), String> {
    COMMON_INFO_SET.with(|store| {
        let mut store = store.borrow_mut();
        if store.contains_key(&key) {
            let mut info = store.get(&key).unwrap();
            info.update_info(content);
            store.insert(key, info);
            return Ok(());
        }
        let info = CommonInfoCfg::create_info(key.clone(), content);
        store.insert(key, info);
        Ok(())
    })
}

#[derive(CandidType, Deserialize,Clone)]
pub struct BatchInfoItem {
    pub key: String,
    pub content: String,
}

pub fn batch_add_info_items(items: Vec<BatchInfoItem>) -> Result<(), String> {
    COMMON_INFO_SET.with(|store| {
        let mut store = store.borrow_mut();
        for item in items {
            if store.contains_key(&item.key) {
                return Err(format!("Key {} already exists", item.key));
            }
            let info = CommonInfoCfg::create_info(item.key.clone(), item.content);
            store.insert(item.key, info);
        }
        Ok(())
    })
}

pub fn get_info_by_key(key: String) -> Option<CommonInfoCfg> {
    COMMON_INFO_SET.with(|store| {
        store.borrow().get(&key)
            .filter(|info| info.check_validity())
    })
}

pub fn batch_get_info(keys: Vec<String>) -> Vec<Option<CommonInfoCfg>> {
    COMMON_INFO_SET.with(|store| {
        let store = store.borrow();
        keys.iter()
            .map(|key| store.get(key)
                .filter(|info| info.check_validity()))
            .collect()
    })
}

pub fn update_info_item(key: String, content: String) -> Result<(), String> {
    COMMON_INFO_SET.with(|store| {
        let mut store = store.borrow_mut();
        match store.get(&key) {
            Some(mut info) if info.check_validity() => {
                info.update_info(content);
                match store.insert(key, info) {
                    Some(_) => Ok(()),
                    None => Ok(())
                }
            },
            _ => Err("Key not found or invalid".to_string())
        }
    })
}


