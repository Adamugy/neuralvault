import { Client, Account, Users } from 'node-appwrite';
import { env } from '../utils/env.js';
const client = new Client()
    .setEndpoint(env.APPWRITE_ENDPOINT)
    .setProject(env.APPWRITE_PROJECT_ID)
    .setKey(env.APPWRITE_API_KEY);
export const appwriteAccount = new Account(client);
export const appwriteUsers = new Users(client);
export const appwriteClient = client;
console.log('[AppWrite] Client initialized for project:', env.APPWRITE_PROJECT_ID);
