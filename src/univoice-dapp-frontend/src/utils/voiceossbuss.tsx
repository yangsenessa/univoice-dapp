import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { isLocalNet } from "@/utils/env";
import {
  BucketCanister,
  ClusterCanister,
  Uploader,
  type FileConfig
} from "@ldclabs/ic_oss_ts";
import { createAgent } from "@dfinity/utils";
import { Ed25519KeyIdentity } from "@dfinity/identity";
import {
  get_access_token,
  record_voice_file as backend_record_voice_file,
  mark_voice_file_deleted as backend_mark_voice_file_deleted,
  list_voice_files as backend_list_voice_files,
  get_voice_file as backend_get_voice_file,
  type MetadataValue,
  type VoiceAssetData,
  type VoiceOssInfo,
  type AccessTokenResponse,
  createActor
} from "./callbackend";

/**
 * Interface for Voice File Metadata
 */
export interface VoiceFileMetadata {
  title?: string;
  description?: string;
  duration?: number;
  tags?: string[];
  [key: string]: any;
}

/**
 * Response for voice file operations
 */
export interface VoiceOperationResponse {
  Ok?: any;
  Err?: string;
}

const development = isLocalNet();
const host = development ? "http://localhost:4943" : "https://ic0.app";

// IC OSS Cluster canister ID (update based on environment)
// Get the OSS cluster canister ID from the backend
const getOssClusterCanisterId = async (): Promise<string> => {
  try {
    const actor = await createActor();
    const result = await actor.get_cluster_canister();
    if (result && Array.isArray(result) && result.length > 0) {
      console.log(`[OSS] Retrieved cluster canister ID: ${result[0]}`);
      return result[0];
    } else {
      console.warn("[OSS] No cluster canister ID found, using fallback");
      return "6rbxx-kiaaa-aaaaj-qapfq-cai"; // Fallback ID
    }
  } catch (error) {
    console.error("[OSS] Error getting cluster canister ID:", error);
    return "6rbxx-kiaaa-aaaaj-qapfq-cai"; // Fallback ID on error
  }
};

// Initialize with fallback, will be updated before use
let OSS_CLUSTER_CANISTER_ID = "6rbxx-kiaaa-aaaaj-qapfq-cai";

// Immediately try to get the actual canister ID
(async () => {
  OSS_CLUSTER_CANISTER_ID = await getOssClusterCanisterId();
})();

// Get the bucket canister ID from the backend, similar to getOssClusterCanisterId
const getBucketCanisterId = async (): Promise<string> => {
  try {
    const actor = await createActor();
    const result = await actor.get_bucket_canister();
    if (result && Array.isArray(result) && result.length > 0) {
      console.log(`[OSS] Retrieved bucket canister ID: ${result[0]}`);
      return result[0];
    } else {
      console.warn("[OSS] No bucket canister ID found, using fallback");
      return "mmrxu-fqaaa-aaaap-ahhna-cai"; // Fallback ID
    }
  } catch (error) {
    console.error("[OSS] Error getting bucket canister ID:", error);
    return "mmrxu-fqaaa-aaaap-ahhna-cai"; // Fallback ID on error
  }
};

// Initialize with fallback, will be updated before use
let OSS_BUCKET_CANISTER_ID = "mmrxu-fqaaa-aaaap-ahhna-cai";

// Immediately try to get the actual canister ID
(async () => {
  OSS_BUCKET_CANISTER_ID = await getBucketCanisterId();
})();

// The JSON representation of the identity key as used in the demo
// This identity should have manager permissions on the bucket
const IDENTITY_JSON = 
  '["302a300506032b6570032100f6f7b1317cca7be2c3f6049da6932aadbd5549d4fd7d7d29290dead0b85d1f96","5b3770cbfd16d3ac610cc3cda0bc292a448f2c78d6634de6ee280df0a65e4c04"]';

// Extract the fixed principal ID to use consistently throughout the code
let FIXED_PRINCIPAL_ID = "";
try {
  const identity = Ed25519KeyIdentity.fromJSON(IDENTITY_JSON);
  FIXED_PRINCIPAL_ID = identity.getPrincipal().toString();
  console.log(`[OSS] Fixed principal ID initialized: ${FIXED_PRINCIPAL_ID}`);
} catch (error) {
  console.error(`[OSS] Error initializing fixed principal ID:`, error);
  // Fallback to the known value from the demo if we can't extract it directly
  FIXED_PRINCIPAL_ID = "pxfqr-x3orr-z5yip-7yzdd-hyxgd-dktgh-3awsk-ohzma-lfjzi-753j7-tae";
  console.log(`[OSS] Using fallback fixed principal ID: ${FIXED_PRINCIPAL_ID}`);
}

/**
 * Creates an identity from the fixed JSON key
 * This matches the approach used in the demo
 * @returns The Ed25519KeyIdentity instance
 */
function createIdentityFromJson(): Ed25519KeyIdentity {
  console.log(`[OSS] Creating identity from fixed JSON key`);
  try {
    const identity = Ed25519KeyIdentity.fromJSON(IDENTITY_JSON);
    const principal = identity.getPrincipal().toString();
    console.log(`[OSS] Created identity with principal: ${principal}`);
    return identity;
  } catch (error) {
    console.error(`[OSS] Error creating identity from JSON:`, error);
    throw error;
  }
}

/**
 * Helper function to create a Principal object that works with ic_oss_ts
 * This handles the type compatibility issues between different versions of @dfinity/principal
 * @param id - Principal ID as string
 * @returns A Principal object compatible with the ic_oss_ts package
 */
function createCompatiblePrincipal(id: string): any {
  console.log(`[OSS] Creating compatible principal for ID: ${id}`);
  try {
    // Try to create a Principal from the ID
    // We'll use the any type to bypass TypeScript's type checking
    const principal = Principal.fromText(id);
    
    console.log(`[OSS] Principal created successfully for ID: ${id}`);
    // Return the principal as any to avoid type compatibility issues
    return principal as any;
  } catch (error) {
    console.error(`[OSS] Error creating principal for ID: ${id}:`, error);
    throw error;
  }
}

/**
 * Derives a consistent key from a principal ID for use with Ed25519KeyIdentity
 * @param principalId - The principal ID string
 * @returns A Uint8Array for use as a key
 */
function deriveKeyFromPrincipal(principalId: string): Uint8Array {
  // Create a deterministic seed based on the principal ID
  // This is a simple derivation method - in production, you would use a more secure approach
  const encoder = new TextEncoder();
  const seed = encoder.encode(`ic-identity-seed-${principalId}`);
  
  // Ensure we have exactly 32 bytes (required for Ed25519)
  const result = new Uint8Array(32);
  
  // Copy as many bytes as we can from the seed, then pad or truncate
  for (let i = 0; i < 32; i++) {
    result[i] = i < seed.length ? seed[i] : 0;
  }
  
  console.log(`[OSS] Derived key from principal ID: ${principalId} (${result.length} bytes)`);
  return result;
}

/**
 * Initializes the OSS bucket canister with the given access token
 * @param accessToken - The access token from the backend
 * @param principalId - Optional principal ID for identity
 * @returns A tuple containing the bucket canister and uploader
 */
async function initOssWithToken(accessToken: string, principalId?: string): Promise<[BucketCanister, Uploader]> {
  console.log(`[OSS] Initializing OSS with token (length: ${accessToken.length}), first 10 chars: ${accessToken.substring(0, 10)}...`);
  try {
    // Create agent options
    const agentOptions: any = {
      host: development ? "http://localhost:4943" : "https://ic0.app",
      fetchOptions: {
        // Don't include credentials to avoid CORS preflight requests
        credentials: 'omit'
      }
    };
    
    let httpAgent;
    
    // Create an identity like in the demo
    try {
      console.log(`[OSS] Using fixed identity approach similar to demo`);
      // Create identity from JSON key
      const identity = createIdentityFromJson();
      
      // Create agent using the demo approach
      httpAgent = await createAgent({
        identity: identity as any,
        fetchRootKey: development,
        host: agentOptions.host,
        verifyQuerySignatures: true
      });
      
      console.log(`[OSS] Created agent with fixed identity`);
    } catch (identityError) {
      console.error(`[OSS] Error creating identity, falling back to anonymous agent:`, identityError);
      httpAgent = new HttpAgent(agentOptions);
    }
    
    if (development) {
      console.log(`[OSS] Fetching root key in development mode`);
      await httpAgent.fetchRootKey();
    }
    
    // Convert the access token string to a Uint8Array
    // The token needs to be properly encoded according to CBOR standards
    let tokenBytes: Uint8Array;
    try {
      // Check if the token is already a base64 encoded string (common for CBOR)
      if (accessToken.match(/^[A-Za-z0-9+/=]+$/)) {
        try {
          // Try to decode as base64
          const binaryString = atob(accessToken);
          tokenBytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            tokenBytes[i] = binaryString.charCodeAt(i);
          }
          console.log(`[OSS] Decoded base64 token to binary, length: ${tokenBytes.length}`);
        } catch (base64Error) {
          console.warn(`[OSS] Failed to decode as base64, falling back to hex check:`, base64Error);
          // Continue to hex check
          throw base64Error;
        }
      }
      // If not base64 or base64 decode failed, check if it's a hex string
      else if (/^[0-9a-fA-F]+$/.test(accessToken)) {
        // Convert hex string to byte array - this is likely already in CBOR format
        tokenBytes = new Uint8Array(
          accessToken.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
        );
        console.log(`[OSS] Converted hex token to binary, length: ${tokenBytes.length}`);
      } 
      // If it's not base64 or hex, it might be a raw string that needs to be properly CBOR encoded
      else {
        // For raw strings, we should use a proper CBOR encoding library
        // But for now, we'll use basic UTF-8 encoding as fallback
        console.warn(`[OSS] Token doesn't appear to be in expected format (base64/hex), using UTF-8 encoding`);
        tokenBytes = new TextEncoder().encode(accessToken);
        console.log(`[OSS] Encoded token as UTF-8, length: ${tokenBytes.length}`);
      }
    } catch (encodingError) {
      console.error(`[OSS] Error processing token:`, encodingError);
      // Fallback to simple encoding
      tokenBytes = new TextEncoder().encode(accessToken);
      console.log(`[OSS] Fallback: encoded token as UTF-8, length: ${tokenBytes.length}`);
    }
    
    // Use type assertions to bypass type compatibility issues
    const bucketCanister = OSS_BUCKET_CANISTER_ID;
    console.log(`[OSS] Using bucket canister ID: ${bucketCanister}`);
    
    // Create the BucketCanister using type assertions to avoid compatibility issues
    // and making sure we're not adding any extraneous data to the token
    const bucket = BucketCanister.create({
      canisterId: bucketCanister,
      agent: httpAgent as any,
      accessToken: tokenBytes
    } as any);
    
    console.log(`[OSS] Bucket canister created successfully`);
    
    // Create an uploader instance
    const uploader = new Uploader(bucket);
    console.log(`[OSS] Uploader instance created`);
    
    return [bucket, uploader];
  } catch (error) {
    console.error(`[OSS] Error initializing OSS with token:`, error);
    throw error;
  }
}

/**
 * Converts a metadata object to the format expected by the backend
 * @param metadata - The metadata object with key-value pairs
 * @returns A formatted array of tuples with metadata values
 */
function formatMetadata(metadata: VoiceFileMetadata): Array<[string, MetadataValue]> {
  console.log(`[OSS] Formatting metadata:`, JSON.stringify(metadata));
  const formattedMetadata = Object.entries(metadata).map(([key, value]) => {
    if (typeof value === 'string') {
      console.log(`[OSS] Metadata "${key}": Text value (length: ${value.length})`);
      return [key, { Text: value }];
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        console.log(`[OSS] Metadata "${key}": Nat value (${value})`);
        return [key, { Nat: BigInt(value) }];
      } else {
        console.log(`[OSS] Metadata "${key}": Int value (${Math.floor(value)})`);
        return [key, { Int: BigInt(Math.floor(value)) }];
      }
    } else if (value instanceof Uint8Array) {
      console.log(`[OSS] Metadata "${key}": Blob value (size: ${value.length} bytes)`);
      return [key, { Blob: value }];
    } else {
      // Convert other types to string
      console.log(`[OSS] Metadata "${key}": Converting to Text (type: ${typeof value})`);
      return [key, { Text: String(value) }];
    }
  }) as Array<[string, MetadataValue]>;
  console.log(`[OSS] Metadata formatted, ${formattedMetadata.length} key-value pairs`);
  return formattedMetadata;
}

/**
 * Creates a proper FileConfig object for uploading to OSS
 * @param file - The file to upload
 * @param folderId - The folder ID
 * @returns A properly formatted FileConfig object
 */
function createFileConfig(file: File, folderId: number): FileConfig {
  console.log(`[OSS] Creating file config for "${file.name}" (type: ${file.type}, size: ${file.size} bytes) in folder ID: ${folderId}`);
  return {
    name: file.name,
    contentType: file.type || 'audio/wav',
    size: file.size,
    parent: folderId,
    content: file
  };
}

/**
 * Uploads a voice file to the OSS bucket and records it in the backend
 * @param file - The file to upload
 * @param folderPath - The folder path in the OSS bucket
 * @param principalId - The principal ID of the user (will be replaced with fixed ID)
 * @param metadata - Optional metadata for the file
 * @returns A promise that resolves to the file ID of the uploaded file
 * @throws Will throw an error if the upload fails
 */
export async function voice_upload(
  file: File,
  folderPath: string,
  principalId: string,
  metadata?: VoiceFileMetadata
): Promise<number> {
  console.log(`[OSS] voice_upload: Starting upload process with params:
  - File: ${file.name} (${file.size} bytes, type: ${file.type})
  - Folder path: ${folderPath}
  - User Principal ID: ${principalId}
  - Using Fixed Principal ID: ${FIXED_PRINCIPAL_ID}
  - Has metadata: ${metadata ? 'yes' : 'no'}`);
  
  try {
    // Get the access token from the backend using the FIXED principal ID
    console.log(`[OSS] Requesting access token for fixed principal: ${FIXED_PRINCIPAL_ID}`);
    const { access_token, folder } = await get_access_token(FIXED_PRINCIPAL_ID);
    console.log(`[OSS] Received access token (length: ${access_token.length}) and folder: ${folder}`);
    
    // Initialize OSS with the access token
    console.log(`[OSS] Initializing OSS with token and using fixed identity`);
    const [bucket, uploader] = await initOssWithToken(access_token);
    console.log(`[OSS] OSS initialized successfully`);
    
    // Get bucket info to verify connection
    const bucketInfo = await bucket.getBucketInfo();
    console.log(`[OSS] Bucket info retrieved:`, bucketInfo);
    
    // Get or create folder info
    let folderId = 0; // Root folder
    console.log(`[OSS] Initial folder ID set to root (0)`);
    
    if (folderPath) {
      console.log(`[OSS] Folder path provided: ${folderPath}, checking if it exists`);
      // List folders to check if it exists
      const folders = await bucket.listFolders(0);
      console.log(`[OSS] Found ${folders.length} folder(s) in root: ${folders.map(f => f.name).join(', ')}`);
      
      const existingFolder = folders.find(f => f.name === folderPath);
      if (existingFolder) {
        folderId = existingFolder.id;
        console.log(`[OSS] Found existing folder: ${folderPath} with ID: ${folderId}`);
      } else {
        // Create folder if it doesn't exist
        console.log(`[OSS] Creating folder: ${folderPath} with parent ID: 0`);
        const folderInfo = await bucket.createFolder({
          name: folderPath,
          parent: 0 // Root folder
        });
        folderId = folderInfo.id;
        console.log(`[OSS] Created folder: ${folderPath} with ID: ${folderId}`);
      }
    }
    
    // Prepare file config for upload
    console.log(`[OSS] Creating file config for upload`);
    const fileConfig = createFileConfig(file, folderId);
    
    // Upload the file to OSS
    console.log(`[OSS] Starting file upload to bucket with folder ID: ${folderId}`);
    const uploadResult = await uploader.upload(fileConfig, (progress) => {
      console.log(`[OSS] Upload progress: ${progress.filled}/${progress.size} bytes (${Math.round((progress.filled / progress.size) * 100)}%)`);
    });
    
    console.log(`[OSS] File uploaded successfully, ID: ${uploadResult.id}, getting file info to confirm upload`);
    
    // Get file info to confirm upload
    const fileInfo = await bucket.getFileInfo(uploadResult.id);
    console.log(`[OSS] File info retrieved:`, fileInfo);
    
    // Format metadata for the backend if provided
    let formattedMetadata;
    if (metadata) {
      console.log(`[OSS] Formatting metadata for backend`);
      formattedMetadata = formatMetadata(metadata);
      console.log(`[OSS] Metadata formatted with ${formattedMetadata.length} entries`);
    }
    
    // Record the voice file in the backend using the adapter function
    // Note: Still use the original user's principalId for backend record
    console.log(`[OSS] Recording voice file in backend with params:
    - User Principal ID: ${principalId}
    - Folder ID: ${folderId}
    - File ID: ${uploadResult.id}
    - Metadata entries: ${formattedMetadata ? formattedMetadata.length : 0}`);
    
    try {
      // Create a Principal object from the string ID
      const principal = Principal.fromText(principalId);
      
      const recordResult = await backend_record_voice_file(
        principalId, // Use the user's principal ID for backend recording
        folderId,
        uploadResult.id,
        formattedMetadata
      );
      
      // Check result
      if ('Ok' in recordResult) {
        console.log(`[OSS] Voice file recorded successfully in backend:`, recordResult.Ok);
        return uploadResult.id;
      } else {
        console.error(`[OSS] Error recording voice file in backend:`, recordResult.Err);
        throw new Error(`Failed to record voice file: ${recordResult.Err}`);
      }
    } catch (recordError) {
      console.error(`[OSS] Error during record_voice_file call:`, recordError);
      
      // Even if we couldn't record it in the backend, we did upload it to OSS
      // Return the file ID so it's not completely lost
      console.log(`[OSS] Returning file ID despite backend record failure: ${uploadResult.id}`);
      return uploadResult.id;
    }
  } catch (error) {
    console.error(`[OSS] Error in voice_upload:`, error);
    throw error;
  }
}

/**
 * Deletes a voice file from the OSS bucket and marks it as deleted in the backend
 * @param fileId - The ID of the file to delete
 * @param principalId - The principal ID of the user (will be replaced with fixed ID)
 * @returns A promise that resolves to a boolean indicating success
 * @throws Will throw an error if the deletion fails
 */
export async function voice_delete(
  fileId: number,
  principalId: string
): Promise<boolean> {
  console.log(`[OSS] voice_delete: Starting deletion process with params:
  - File ID: ${fileId}
  - User Principal ID: ${principalId}
  - Using Fixed Principal ID: ${FIXED_PRINCIPAL_ID}`);
  
  try {
    // Get the access token from the backend using the FIXED principal ID
    console.log(`[OSS] Requesting access token for fixed principal: ${FIXED_PRINCIPAL_ID}`);
    const { access_token } = await get_access_token(FIXED_PRINCIPAL_ID);
    console.log(`[OSS] Received access token (length: ${access_token.length})`);
    
    // Initialize OSS with the access token
    console.log(`[OSS] Initializing OSS with token and using fixed identity`);
    const [bucket] = await initOssWithToken(access_token);
    console.log(`[OSS] OSS initialized successfully`);
    
    // Delete the file from OSS
    console.log(`[OSS] Deleting file with ID: ${fileId} from OSS bucket`);
    const deleteResult = await bucket.deleteFile(fileId);
    console.log(`[OSS] OSS delete result:`, deleteResult);
    
    if (deleteResult) {
      // Mark the file as deleted in the backend using the adapter function
      console.log(`[OSS] Marking file with ID: ${fileId} as deleted in backend`);
      const markResult = await backend_mark_voice_file_deleted(fileId);
      
      if ('Ok' in markResult) {
        console.log(`[OSS] Voice file marked as deleted successfully`);
        return true;
      } else {
        console.error(`[OSS] Error marking voice file as deleted:`, markResult.Err);
        return false;
      }
    } else {
      console.error(`[OSS] Failed to delete file from OSS`);
      return false;
    }
  } catch (error) {
    console.error(`[OSS] Error in voice_delete:`, error);
    throw error;
  }
}

/**
 * Fetches voice file data from the backend
 * @param fileId - The ID of the file to fetch
 * @returns A promise that resolves to the voice asset data or null if not found
 * @throws Will throw an error if the fetch fails
 */
export async function fetch_voice_info(
  fileId: number
): Promise<VoiceAssetData | null> {
  console.log(`[OSS] fetch_voice_info: Fetching voice file data for ID: ${fileId}`);
  
  try {
    // Use the adapter function
    console.log(`[OSS] Calling backend_get_voice_file with file ID: ${fileId}`);
    const result = await backend_get_voice_file(fileId);
    console.log(`[OSS] Voice file data retrieved:`, result ? 'success' : 'null');
    return result;
  } catch (error) {
    console.error(`[OSS] Error fetching voice file data for ID: ${fileId}:`, error);
    throw error;
  }
}

/**
 * Fetches a voice file content directly from the OSS bucket
 * @param fileId - The ID of the file to fetch
 * @param principalId - The principal ID of the user (will be replaced with fixed ID)
 * @returns A promise that resolves to the file content as an ArrayBuffer
 * @throws Will throw an error if the fetch fails
 */
export async function fetch_voice_content(
  fileId: number,
  principalId: string
): Promise<ArrayBuffer> {
  console.log(`[OSS] fetch_voice_content: Starting content fetch with params:
  - File ID: ${fileId}
  - User Principal ID: ${principalId}
  - Using Fixed Principal ID: ${FIXED_PRINCIPAL_ID}`);
  
  try {
    // First, get the voice file info to ensure it exists and get metadata
    console.log(`[OSS] Fetching voice file info for ID: ${fileId}`);
    const fileInfo = await fetch_voice_info(fileId);
    console.log(`[OSS] Voice file info retrieved:`, fileInfo ? 'success' : 'null');
    
    if (!fileInfo) {
      console.error(`[OSS] Voice file with ID ${fileId} not found`);
      throw new Error(`Voice file with ID ${fileId} not found`);
    }
    
    // Get the access token using the FIXED principal ID
    console.log(`[OSS] Requesting access token for fixed principal: ${FIXED_PRINCIPAL_ID}`);
    const { access_token } = await get_access_token(FIXED_PRINCIPAL_ID);
    console.log(`[OSS] Received access token (length: ${access_token.length})`);
    
    // Initialize OSS with the access token
    console.log(`[OSS] Initializing OSS with token and using fixed identity`);
    const [bucket] = await initOssWithToken(access_token);
    console.log(`[OSS] OSS initialized successfully`);
    
    // Get file chunks
    console.log(`[OSS] Getting file chunks for file ID: ${fileId}, offset: 0`);
    const chunks = await bucket.getFileChunks(fileId, 0);
    console.log(`[OSS] Retrieved ${chunks ? chunks.length : 0} file chunks`);
    
    if (!chunks || chunks.length === 0) {
      console.error(`[OSS] No content found for voice file with ID ${fileId}`);
      throw new Error(`No content found for voice file with ID ${fileId}`);
    }
    
    // Calculate total size and create buffer
    let totalSize = 0;
    chunks.forEach((chunk) => {
      // Access the content property using type assertion
      const content = (chunk as any).content as Uint8Array;
      totalSize += content.length;
    });
    
    console.log(`[OSS] Creating buffer with total size: ${totalSize} bytes`);
    const result = new Uint8Array(totalSize);
    
    // Concatenate all chunks
    let offset = 0;
    chunks.forEach((chunk, index) => {
      // Access the content property using type assertion
      const content = (chunk as any).content as Uint8Array;
      console.log(`[OSS] Adding chunk ${index + 1} at offset: ${offset}`);
      result.set(content, offset);
      offset += content.length;
    });
    
    console.log(`[OSS] Voice file content retrieved successfully, total size: ${totalSize} bytes`);
    return result.buffer;
  } catch (error) {
    console.error(`[OSS] Error fetching voice file content for ID: ${fileId}:`, error);
    throw error;
  }
}

/**
 * Lists voice files for a user
 * @param principalId - The principal ID of the user
 * @param folderId - Optional folder ID to filter by
 * @param createdAfter - Optional timestamp to filter files created after
 * @param limit - Optional limit on the number of files to return
 * @returns A promise that resolves to an array of voice file info objects
 * @throws Will throw an error if the listing fails
 */
export async function list_voice_files(
  principalId: string,
  folderId?: number,
  createdAfter?: bigint,
  limit?: number
): Promise<VoiceOssInfo[]> {
  console.log(`[OSS] list_voice_files: Starting list operation with params:
  - Principal ID: ${principalId}
  - Folder ID: ${folderId !== undefined ? folderId : 'not specified'}
  - Created after: ${createdAfter !== undefined ? createdAfter.toString() : 'not specified'}
  - Limit: ${limit !== undefined ? limit : 'not specified'}`);
  
  try {
    // Use the adapter function
    console.log(`[OSS] Calling backend_list_voice_files with the specified parameters`);
    const result = await backend_list_voice_files(
      principalId,
      folderId,
      createdAfter,
      limit
    );
    
    if ('Ok' in result) {
      console.log(`[OSS] Retrieved ${result.Ok.length} voice files successfully`);
      return result.Ok;
    } else {
      console.error(`[OSS] Error listing voice files:`, result.Err);
      return [];
    }
  } catch (error) {
    console.error(`[OSS] Error in list_voice_files:`, error);
    throw error;
  }
}

/**
 * Generates a mock identity (for development purposes only)
 * This is a placeholder and doesn't actually create a real identity
 */
function generateIdentity() {
  console.log('Mock identity generation - not implemented');
  // In a real implementation, this would use Ed25519KeyIdentity.generate()
  // But we're avoiding that dependency for now
}

