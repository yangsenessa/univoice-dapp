import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "declarations/univoice-dapp-backend/univoice-dapp-backend.did.js";
import type { TaskData } from "declarations/univoice-dapp-backend/univoice-dapp-backend.did";
import { isLocalNet } from "@/utils/env";

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