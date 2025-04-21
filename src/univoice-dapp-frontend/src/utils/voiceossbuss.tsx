import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { isLocalNet } from "@/utils/env";
import {
  BucketCanister,
  ClusterCanister,
  Uploader,
  type FileConfig
} from "@ldclabs/ic_oss_ts";
import {
  get_access_token,
  record_voice_file as backend_record_voice_file,
  mark_voice_file_deleted as backend_mark_voice_file_deleted,
  list_voice_files as backend_list_voice_files,
  get_voice_file as backend_get_voice_file,
  type MetadataValue,
  type VoiceAssetData,
  type VoiceOssInfo,
  type AccessTokenResponse
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

// IC OSS Cluster canister ID (update based on environment)
const OSS_CLUSTER_CANISTER_ID = "6rbxx-kiaaa-aaaaj-qapfq-cai";

/**
 * Helper function to create a Principal object that works with ic_oss_ts
 * This handles the type compatibility issues between different versions of @dfinity/principal
 * @param id - Principal ID as string
 * @returns A Principal object compatible with the ic_oss_ts package
 */
function createCompatiblePrincipal(id: string): any {
  try {
    // Try to create a Principal from the ID
    // We'll use the any type to bypass TypeScript's type checking
    const principal = Principal.fromText(id);
    
    // Return the principal as any to avoid type compatibility issues
    return principal as any;
  } catch (error) {
    console.error("Error creating principal:", error);
    throw error;
  }
}

/**
 * Initializes the OSS cluster and bucket canisters with the given access token
 * @param accessToken - The access token from the backend
 * @returns A tuple containing the bucket canister and uploader
 */
async function initOssWithToken(accessToken: string): Promise<[BucketCanister, Uploader]> {
  try {
    // Convert the access token string to a Uint8Array
    const tokenBytes = new TextEncoder().encode(accessToken);
    
    // Create an HttpAgent
    const httpAgent = new HttpAgent({
      host: development ? "http://localhost:4943" : "https://ic0.app"
    });
    
    if (development) {
      // Only fetch the root key in development
      await httpAgent.fetchRootKey();
    }
    
    // Use 'any' type assertion to bypass type checking for agent compatibility
    const agent = httpAgent as any;
    
    // Create a Cluster canister client with type assertion to bypass compatibility issues
    const clusterOptions = {
      canisterId: OSS_CLUSTER_CANISTER_ID,
      agent: agent
    } as any;
    
    const cluster = ClusterCanister.create(clusterOptions);
    
    // Get the bucket canister IDs from the cluster
    const buckets = await cluster.getBuckets();
    if (buckets.length === 0) {
      throw new Error("No OSS buckets available");
    }
    
    // Use the first bucket
    const bucketId = buckets[0].toString();
    console.log("Using OSS bucket:", bucketId);
    
    // Create a Bucket canister client with type assertion
    const bucketOptions = {
      canisterId: bucketId,
      agent: agent,
      accessToken: tokenBytes
    } as any;
    
    const bucket = BucketCanister.create(bucketOptions);
    
    // Create an uploader instance
    const uploader = new Uploader(bucket);
    
    return [bucket, uploader];
  } catch (error) {
    console.error("Error initializing OSS with token:", error);
    throw error;
  }
}

/**
 * Converts a metadata object to the format expected by the backend
 * @param metadata - The metadata object with key-value pairs
 * @returns A formatted array of tuples with metadata values
 */
function formatMetadata(metadata: VoiceFileMetadata): Array<[string, MetadataValue]> {
  return Object.entries(metadata).map(([key, value]) => {
    if (typeof value === 'string') {
      return [key, { Text: value }];
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        return [key, { Nat: BigInt(value) }];
      } else {
        return [key, { Int: BigInt(Math.floor(value)) }];
      }
    } else if (value instanceof Uint8Array) {
      return [key, { Blob: value }];
    } else {
      // Convert other types to string
      return [key, { Text: String(value) }];
    }
  });
}

/**
 * Creates a proper FileConfig object for uploading to OSS
 * @param file - The file to upload
 * @param folderId - The folder ID
 * @returns A properly formatted FileConfig object
 */
function createFileConfig(file: File, folderId: number): FileConfig {
  // Create a custom object that satisfies the FileConfig interface
  // This allows us to include all required properties
  const fileObj = {
    name: file.name,
    contentType: file.type || 'audio/wav',
    size: file.size,
    parent: folderId,
    content: file, // This is what the Uploader actually needs
    file: file     // Keep the original file reference too
  };
  
  return fileObj as FileConfig;
}

/**
 * Uploads a voice file to the OSS bucket and records it in the backend
 * @param file - The file to upload
 * @param folderPath - The folder path in the OSS bucket
 * @param principalId - The principal ID of the user
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
  try {
    console.log(`Uploading voice file: ${file.name} for principal: ${principalId}`);
    
    // First, get the access token from the backend
    const { access_token, folder } = await get_access_token(principalId);
    
    // Initialize OSS with the access token
    const [bucket, uploader] = await initOssWithToken(access_token);
    
    // Get or create folder info
    // For simplicity, we'll use the folder provided by the backend
    // or create a subfolder if folderPath is provided
    let folderId = 0; // Root folder
    
    if (folderPath) {
      // Get bucket info first
      const bucketInfo = await bucket.getBucketInfo();
      console.log("Bucket info retrieved:", bucketInfo);
      
      // Create folder if it doesn't exist
      try {
        const folderInfo = await bucket.createFolder({
          name: folderPath,
          parent: 0 // Root folder
        });
        folderId = folderInfo.id;
        console.log(`Created folder: ${folderPath} with ID: ${folderId}`);
      } catch (error) {
        // Folder might already exist, try to list folders to find it
        const folders = await bucket.listFolders(0);
        const existingFolder = folders.find(f => f.name === folderPath);
        if (existingFolder) {
          folderId = existingFolder.id;
          console.log(`Found existing folder: ${folderPath} with ID: ${folderId}`);
        } else {
          throw new Error(`Failed to create or find folder: ${folderPath}`);
        }
      }
    }
    
    // Prepare file config for upload
    const fileConfig = createFileConfig(file, folderId);
    
    // Upload the file to OSS
    const uploadResult = await uploader.upload(fileConfig, (progress) => {
      console.log(`Upload progress: ${progress.filled}/${progress.size} bytes`);
    });
    
    console.log("File uploaded successfully, ID:", uploadResult.id);
    
    // Get file info to confirm upload
    const fileInfo = await bucket.getFileInfo(uploadResult.id);
    console.log("File info retrieved:", fileInfo);
    
    // Format metadata for the backend if provided
    const formattedMetadata = metadata ? formatMetadata(metadata) : undefined;
    
    // Record the voice file in the backend using the adapter function
    const recordResult = await backend_record_voice_file(
      principalId,
      folderId,
      uploadResult.id,
      formattedMetadata
    );
    
    // Check result
    if ('Ok' in recordResult) {
      console.log("Voice file recorded successfully:", recordResult.Ok);
      return uploadResult.id;
    } else {
      console.error("Error recording voice file:", recordResult.Err);
      throw new Error(`Failed to record voice file: ${recordResult.Err}`);
    }
  } catch (error) {
    console.error("Error in voice_upload:", error);
    throw error;
  }
}

/**
 * Deletes a voice file from the OSS bucket and marks it as deleted in the backend
 * @param fileId - The ID of the file to delete
 * @param principalId - The principal ID of the user
 * @returns A promise that resolves to a boolean indicating success
 * @throws Will throw an error if the deletion fails
 */
export async function voice_delete(
  fileId: number,
  principalId: string
): Promise<boolean> {
  try {
    console.log(`Deleting voice file ID: ${fileId} for principal: ${principalId}`);
    
    // First, get the access token from the backend
    const { access_token } = await get_access_token(principalId);
    
    // Initialize OSS with the access token
    const [bucket] = await initOssWithToken(access_token);
    
    // Delete the file from OSS
    const deleteResult = await bucket.deleteFile(fileId);
    console.log("OSS delete result:", deleteResult);
    
    if (deleteResult) {
      // Mark the file as deleted in the backend using the adapter function
      const markResult = await backend_mark_voice_file_deleted(fileId);
      
      if ('Ok' in markResult) {
        console.log("Voice file marked as deleted successfully");
        return true;
      } else {
        console.error("Error marking voice file as deleted:", markResult.Err);
        return false;
      }
    } else {
      console.error("Failed to delete file from OSS");
      return false;
    }
  } catch (error) {
    console.error("Error in voice_delete:", error);
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
  try {
    console.log(`Fetching voice file data for ID: ${fileId}`);
    
    // Use the adapter function
    return await backend_get_voice_file(fileId);
  } catch (error) {
    console.error("Error fetching voice file data:", error);
    throw error;
  }
}

/**
 * Fetches a voice file content directly from the OSS bucket
 * @param fileId - The ID of the file to fetch
 * @param principalId - The principal ID of the user
 * @returns A promise that resolves to the file content as an ArrayBuffer
 * @throws Will throw an error if the fetch fails
 */
export async function fetch_voice_content(
  fileId: number,
  principalId: string
): Promise<ArrayBuffer> {
  try {
    console.log(`Fetching voice file content for ID: ${fileId}`);
    
    // First, get the voice file info to ensure it exists and get metadata
    const fileInfo = await fetch_voice_info(fileId);
    if (!fileInfo) {
      throw new Error(`Voice file with ID ${fileId} not found`);
    }
    
    // Get the access token
    const { access_token } = await get_access_token(principalId);
    
    // Initialize OSS with the access token
    const [bucket] = await initOssWithToken(access_token);
    
    // Get file chunks
    const chunks = await bucket.getFileChunks(fileId, 0);
    if (!chunks || chunks.length === 0) {
      throw new Error(`No content found for voice file with ID ${fileId}`);
    }
    
    // Calculate total size and create buffer
    let totalSize = 0;
    chunks.forEach(chunk => {
      // Access the content property using type assertion
      const content = (chunk as any).content as Uint8Array;
      totalSize += content.length;
    });
    
    const result = new Uint8Array(totalSize);
    
    // Concatenate all chunks
    let offset = 0;
    chunks.forEach(chunk => {
      // Access the content property using type assertion
      const content = (chunk as any).content as Uint8Array;
      result.set(content, offset);
      offset += content.length;
    });
    
    console.log(`Retrieved voice file content, size: ${totalSize} bytes`);
    return result.buffer;
  } catch (error) {
    console.error("Error fetching voice file content:", error);
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
  try {
    console.log(`Listing voice files for principal: ${principalId}`);
    
    // Use the adapter function
    const result = await backend_list_voice_files(
      principalId,
      folderId,
      createdAfter,
      limit
    );
    
    if ('Ok' in result) {
      console.log(`Retrieved ${result.Ok.length} voice files`);
      return result.Ok;
    } else {
      console.error("Error listing voice files:", result.Err);
      return [];
    }
  } catch (error) {
    console.error("Error in list_voice_files:", error);
    throw error;
  }
} 