import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "declarations/univoice-dapp-backend/univoice-dapp-backend.did.js";

import type { TaskData } from "declarations/univoice-dapp-backend/univoice-dapp-backend.did";
import { isLocalNet } from "@/utils/env";
import { idlFactory as vmc_idlFactory } from "../idl/univoice-vmc-backend.did.js";

/**
 * Interface for MainSiteSummary as defined in the .did.js file
 */
export interface MainSiteSummary {
  token_pool_balance: bigint;
  listener_count: bigint;
  token_per_block: bigint;
  aigcblock_created_number: bigint;
}

/**
 * Utility functions for interacting with the univoice-dapp backend canister
 * @module callbackend
 */


const development = isLocalNet();

// Backend canister ID - use the correct ID from the parent .env file
const BACKEND_CANISTER_ID = "224pv-saaaa-aaaaj-af7qa-cai";
console.log("Backend canister ID:", BACKEND_CANISTER_ID);

// Create agent and actor
const createActor = async () => {
    const agent = new HttpAgent({
        host: development ? "http://localhost:4943" : "https://ic0.app",
    });

    if (development) {
        // Only fetch the root key in development
        await agent.fetchRootKey();
    }

    return Actor.createActor(idlFactory, {
        agent,
        canisterId: BACKEND_CANISTER_ID,
    });
};

/**
 * Gets user tasks from the backend canister
 * @param principalId - The principal ID of the user
 * @returns A promise that resolves to an array of TaskData or null if no tasks found
 * @throws Will throw an error if the backend call fails
 */
export async function get_user_tasks(principalId: string): Promise<TaskData[] | null> {
    try {
        console.log("Fetching tasks for principal ID:", principalId);
        const actor = await createActor();
        const result = await actor.get_user_tasks(principalId) as TaskData[][];
        
        if (result.length === 0) {
            return null;
        }
        console.log("User tasks retrieved:", result[0]);
        return result[0]; // The API returns [Array<TaskData>] or []
    } catch (error) {
        console.error("Error fetching user tasks:", error);
        throw error;
    }
}

/**
 * Updates task status in the backend canister
 * @param principalId - The principal ID of the user
 * @param taskId - The ID of the task to update
 * @param status - The new status of the task (e.g., "FINISH")
 * @returns A promise that resolves to either {Ok: null} on success or {Err: string} on failure
 */
export async function update_task_status(
    principalId: string,
    taskId: string,
    status: string
): Promise<{ Ok: null } | { Err: string }> {
    try {
        const actor = await createActor();
        const result = await actor.update_task_status(principalId, taskId, status) as { Ok: null } | { Err: string };
        return result;
    } catch (error) {
        console.error("Error updating task status:", error);
        return { Err: `Failed to update task status: ${error.message}` };
    }
}

/**
 * Claims a reward for completing a task
 * @param dappPrincipalId - The dapp principal ID
 * @param walletPrincipalId - The wallet principal ID
 * @param amount - The reward amount to claim
 * @returns A promise that resolves to a boolean indicating success or failure
 */
export async function claim_reward(
    dappPrincipalId: string | null = null,
    walletPrincipalId: string | null = null,
    amount: bigint
): Promise<boolean> {
    try {
        const actor = await createActor();
        const result = await actor.claim_reward(
            dappPrincipalId ? [dappPrincipalId] : [], 
            walletPrincipalId ? [walletPrincipalId] : [], 
            amount
        );
        return Boolean(result);
    } catch (error) {
        console.error("Error claiming reward:", error);
        return false;
    }
}
/**
 * Adds custom information for a user to the backend canister
 * @param customInfo - The custom information object to add
 * @returns A promise that resolves to either {Ok: null} on success or {Err: string} on failure
 */
export async function add_custom_info(customInfo: {
    dapp_principal: string;
    wallet_principal: string;
    nick_name: string;
    logo: string;
    is_invite_code_filled: boolean;
    invite_code: string;
    used_invite_code: string | [] | [string];  // 更灵活的类型定义，兼容多种形式的opt text
    total_rewards: bigint;
}): Promise<{ Ok: null } | { Err: string }> {
    try {
        // 处理used_invite_code字段，确保发送给Candid接口的是正确格式
        const processedInfo = {
            ...customInfo,
            used_invite_code: typeof customInfo.used_invite_code === "string" 
                ? [customInfo.used_invite_code] 
                : customInfo.used_invite_code
        };
        
        console.log("Adding custom info:", processedInfo);
        const actor = await createActor();
        const result = await actor.add_custom_info(processedInfo) as { Ok: null } | { Err: string };
        console.log("Custom info add result:", result);
        return result;
    } catch (error) {
        console.error("Error adding custom info:", error);
        return { Err: `Failed to add custom info: ${error.message}` };
    }
}

/**
 * Gets custom information for a user from the backend canister
 * @param dappPrincipalId - The dapp principal ID (optional)
 * @param walletPrincipalId - The wallet principal ID (optional)
 * @returns A promise that resolves to the custom information or null if not found
 */
export async function get_custom_info(
    dappPrincipalId: string | null = null,
    walletPrincipalId: string | null = null
): Promise<any | null> {
    try {
        const actor = await createActor();
        const result = await actor.get_custom_info(
            dappPrincipalId ? [dappPrincipalId] : [], 
            walletPrincipalId ? [walletPrincipalId] : []
        );
        
        const resultArray = Array.isArray(result) ? result : [];
        return resultArray.length > 0 ? resultArray[0] : null;
    } catch (error) {
        console.error("Error fetching custom info:", error);
        return null;
    }
}

/**
 * Creates an actor for the VMC backend canister
 * @returns A promise that resolves to the VMC backend actor
 */
const createVMCActor = async () => {
    const agent = new HttpAgent({
        host: development ? "http://localhost:4943" : "https://ic0.app",
    });

    if (development) {
        await agent.fetchRootKey();
    }

    return Actor.createActor(vmc_idlFactory, {
        agent,
        canisterId: "bw4dl-smaaa-aaaaa-qaacq-cai", // VMC backend canister ID
    });
};

/**
 * Gets unclaimed mint ledger balance for a principal within the last day
 * @param principalId - The principal ID to check
 * @returns A promise that resolves to the unclaimed balance as BigInt
 * @throws Will throw an error if the backend call fails
 */
export async function sum_unclaimed_mint_ledger_onceday(principalId: string): Promise<bigint> {
    try {
        console.log("Fetching unclaimed mint ledger balance for:", principalId);
        const actor = await createVMCActor();
        const result = await actor.sum_unclaimed_mint_ledger_onceday(principalId) as bigint;
        console.log("Unclaimed balance retrieved:", result.toString());
        return result;
    } catch (error) {
        console.error("Error fetching unclaimed mint ledger balance:", error);
        throw error;
    }
}

/**
 * Gets the total unclaimed rewards (from both tasks and invites) for a user
 * @param userPrincipal - The principal ID of the user
 * @returns A promise that resolves to a BigInt representing the total unclaimed rewards
 * @throws Will throw an error if the backend call fails
 */
export async function get_unclaimed_rewards(userPrincipal: string): Promise<bigint> {
    try {
        console.log("Fetching unclaimed rewards for principal:", userPrincipal);
        const actor = await createActor();
        const result = await actor.get_unclaimed_rewards(userPrincipal) as bigint;
        console.log("Total unclaimed rewards retrieved:", result.toString());
        return result;
    } catch (error) {
        console.error("Error fetching unclaimed rewards:", error);
        throw error;
    }
}

/**
 * Calculates the total rewards a user can claim by summing the unclaimed mint ledger balance
 * and the unclaimed rewards from tasks and invites
 * 
 * @param principalId - The principal ID of the user
 * @returns A promise that resolves to a BigInt representing the total claimable rewards
 * @throws Will throw an error if any of the backend calls fail
 */
export async function calculate_total_claimable_rewards(principalId: string): Promise<bigint> {
    try {
        console.log("Calculating total claimable rewards for:", principalId);
        
        // Fetch both types of rewards concurrently for better performance
        const [mintLedgerBalance, unclaimedRewards] = await Promise.all([
            sum_unclaimed_mint_ledger_onceday(principalId),
            get_unclaimed_rewards(principalId)
        ]);
        
        const totalRewards = mintLedgerBalance + unclaimedRewards;
        console.log("Total claimable rewards calculated:", totalRewards.toString());
        
        return totalRewards;
    } catch (error) {
        console.error("Error calculating total claimable rewards:", error);
        throw error;
    }
}

/**
 * Uses an invite code for a new user
 * @param code - The invite code to use
 * @param newUserPrincipalId - The principal ID of the new user
 * @returns A promise that resolves to either {Ok: InviteRewardRecord} on success or {Err: string} on failure
 */
export async function use_invite_code(
    code: string,
    newUserPrincipalId: string
): Promise<{ Ok: any } | { Err: string }> {
    try {
        const actor = await createActor();
        const result = await actor.use_invite_code(code, newUserPrincipalId) as { Ok: any } | { Err: string };
        console.log("Invite code use result:", result);
        return result;
    } catch (error) {
        console.error("Error using invite code:", error);
        return { Err: `Failed to use invite code: ${error.message}` };
    }
}

/**
 * Gets friend information for a user from the backend canister
 * @param principalId - The principal ID of the user
 * @returns A promise that resolves to an object with 'friends' array containing friend information
 */
export async function get_friend_infos(principalId: string): Promise<{ 
    friends: Array<{ name: string; avatar: string; friendnum: number; rewards: number }>
}> {
        try {
                const actor = await createActor();
                const result = await actor.get_friend_infos(principalId);
                console.log("Friend information retrieved:", result);
                
                // Process the result based on the DID definition that returns vec record { CustomInfo; nat }
                return {
                        friends: Array.isArray(result) ? result.map((item, index) => {
                                const customInfo = item[0]; // CustomInfo part
                                const rewardAmount = Number(item[1]) || 0; // nat part (reward amount)
                                
                                return {
                                        name: customInfo.nick_name || '',
                                        avatar: customInfo.logo || '',
                                        friendnum: index, // Using the index as friendnum as requested
                                        rewards: rewardAmount
                                };
                        }) : []
                };
        } catch (error) {
                console.error("Error fetching friend information:", error);
                return { friends: [] };
        }
}


/**
 * Gets the main site summary data from the VMC backend canister
 * @returns A promise that resolves to the MainSiteSummary object
 * @throws Will throw an error if the backend call fails
 */
export async function get_main_site_summary(): Promise<MainSiteSummary> {
    try {
        console.log("Fetching main site summary data");
        const actor = await createVMCActor();
        const result = await actor.get_main_site_summary() as MainSiteSummary;
        console.log("Main site summary data retrieved:", result);
        return result;
    } catch (error) {
        console.error("Error fetching main site summary data:", error);
        throw error;
    }
}