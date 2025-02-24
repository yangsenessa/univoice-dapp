use candid::{CandidType, Deserialize};
use serde::Serialize;
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager,VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, Storable, StableBTreeMap, StableVec, storable::Bound};
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

#[derive(Clone, CandidType, Deserialize, Serialize)]
pub struct CustomInfo {
    pub dapp_principal: String,
    pub wallet_principal: String,
    pub nick_name: String,
    pub logo: String,
}

impl Storable for CustomInfo {
    fn to_bytes(&self) -> std::borrow::Cow<[u8]> {
        let serialized = candid::encode_one(self).expect("Failed to serialize CustomInfo");
        std::borrow::Cow::Owned(serialized)
    }

    fn from_bytes(bytes: std::borrow::Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).expect("Failed to deserialize CustomInfo")
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 4096,
        is_fixed_size: false,
    };
}

impl CustomInfo {
    pub fn create_custominfo(dapp_principal: String, wallet_principal: String, nick_name: String, logo: String) -> Self {
        CustomInfo {
            dapp_principal,
            wallet_principal,
            nick_name,
            logo,
        }
    }

    pub fn update_custominfo(&mut self, nick_name: String, logo: String) {
        self.nick_name = nick_name;
        self.logo = logo;
    }
}


thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = 
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
    
    static COMMON_INFO_MAP: RefCell<StableBTreeMap<String, CommonInfoCfg, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)))
        )
    );

    static CUSTOM_INFO_SET: RefCell<StableVec<CustomInfo, Memory>> = RefCell::new(
        StableVec::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1)))
        ).unwrap()
    );
}

pub fn add_info_item(key: String, content: String) -> Result<(), String> {
    COMMON_INFO_MAP.with(|store| {
        let mut store = store.borrow_mut();
        let info = CommonInfoCfg::create_info(key.clone(), content);
        
        // Since COMMON_INFO_MAP is a StableBTreeMap, we can directly use insert
        store.insert(key, info);      
        Ok(())
    })
}

#[derive(CandidType, Deserialize, Clone)]
pub struct BatchInfoItem {
    pub key: String,
    pub content: String,
}

pub fn batch_add_info_items(items: Vec<BatchInfoItem>) -> Result<(), String> {
    COMMON_INFO_MAP.with(|store| {
        let mut store = store.borrow_mut();
        for item in items {
            let info = CommonInfoCfg::create_info(item.key.clone(), item.content);
            store.insert(item.key, info);
        }
        Ok(())
    })
}

pub fn get_info_by_key(key: &String) -> Option<CommonInfoCfg> {
    COMMON_INFO_MAP.with(|store| {
        let store = store.borrow();
        store.get(key)
            .filter(|info| info.check_validity())
    })
}

pub fn batch_get_info(keys: Vec<String>) -> Vec<Option<CommonInfoCfg>> {
    COMMON_INFO_MAP.with(|store| {
        let store = store.borrow();
        keys.iter()
            .map(|key| {
                store.get(key)
                    .filter(|info| info.check_validity())
            })
            .collect()
    })
}

pub fn update_info_item(key: String, content: String) -> Result<(), String> {
    COMMON_INFO_MAP.with(|store| {
        let mut store = store.borrow_mut();
        
        if let Some(mut existing_info) = store.get(&key) {
            if !existing_info.check_validity() {
                return Err("Info item is not valid".to_string());
            }
            existing_info.update_info(content);
            store.insert(key, existing_info);
            Ok(())
        } else {
            Err("Key not found".to_string())
        }
    })
}
/** -------------------------------custom info--------------------------------- */
pub fn find_custom_info_index(dapp_principal: &str, wallet_principal: &str) -> Option<u64> {
    CUSTOM_INFO_SET.with(|store| {
        let store = store.borrow();
        for i in 0..store.len() {
            if let Some(info) = store.get(i) {
                if (!info.dapp_principal.is_empty() && info.dapp_principal == dapp_principal) ||
                   (!info.wallet_principal.is_empty() && info.wallet_principal == wallet_principal) {
                    return Some(i);
                }
            }
        }
        None
    })
}

pub fn add_custom_info(info: CustomInfo) -> Result<(), String> {
    // Validate that at least one principal is provided
    if info.dapp_principal.is_empty() && info.wallet_principal.is_empty() {
        return Err("Either dapp_principal or wallet_principal must be provided".to_string());
    }

    // Check if custom already exists
    if let Some(index) = find_custom_info_index(&info.dapp_principal, &info.wallet_principal) {
        // Update existing custom info
        CUSTOM_INFO_SET.with(|store| {
            let mut store = store.borrow_mut();
            let mut existing_info = store.get(index)
                .ok_or("Failed to get existing custom info")?;
            
            // Update modifiable fields
            if !info.wallet_principal.is_empty() {
                existing_info.wallet_principal = info.wallet_principal;
            }
            if !info.logo.is_empty() {
                existing_info.logo = info.logo;
            }
            if !info.nick_name.is_empty() {
                existing_info.nick_name = info.nick_name;
            }
            
            store.set(index, &existing_info);
            Ok(())
        })
    } else {
        // Add new custom info
        CUSTOM_INFO_SET.with(|store| {
            let mut store = store.borrow_mut();
            store.push(&info)
                .map_err(|e| format!("Failed to store custom info: {}", e))
        })
    }
}

pub fn get_custom_info(dapp_principal: Option<String>, wallet_principal: Option<String>) -> Option<CustomInfo> {
    if dapp_principal.is_none() && wallet_principal.is_none() {
        return None;
    }

    CUSTOM_INFO_SET.with(|store| {
        let store = store.borrow();
        for i in 0..store.len() {
            if let Some(info) = store.get(i) {
                match (&dapp_principal, &wallet_principal) {
                    (Some(dapp), _) if !info.dapp_principal.is_empty() && info.dapp_principal == *dapp => return Some(info),
                    (_, Some(wallet)) if !info.wallet_principal.is_empty() && info.wallet_principal == *wallet => return Some(info),
                    _ => continue,
                }
            }
        }
        None
    })
}

pub fn update_custom_info(dapp_principal: Option<String>, wallet_principal: Option<String>, nick_name: String, logo: String) -> Result<(), String> {
    // Validate that at least one principal is provided
    if dapp_principal.is_none() && wallet_principal.is_none() {
        return Err("Either dapp_principal or wallet_principal must be provided".to_string());
    }

    // Find the index of the custom info
    let index = match (dapp_principal, wallet_principal) {
        (Some(dapp), _) => find_custom_info_index(&dapp, ""),
        (_, Some(wallet)) => find_custom_info_index("", &wallet),
        _ => None,
    };

    // Update the custom info if found
    if let Some(index) = index {
        CUSTOM_INFO_SET.with(|store| {
            let mut store = store.borrow_mut();
            if let Some(mut info) = store.get(index) {
                info.update_custominfo(nick_name, logo);
                store.set(index, &info);
                Ok(())
            } else {
                Err("Custom info not found".to_string())
            }
        })
    } else {
        Err("Custom info not found".to_string())
    }
}

pub fn list_custom_info(page: u64, page_size: u64) -> Vec<CustomInfo> {
    CUSTOM_INFO_SET.with(|store| {
        let store = store.borrow();
        let start = page * page_size;
        let end = std::cmp::min(start + page_size, store.len());
        
        // Check if start is within bounds
        if start >= store.len() {
            return Vec::new();
        }
        
        (start..end)
            .filter_map(|i| store.get(i))
            .collect()
    })
}





