import { lucia } from "lucia";
import { prisma } from "@lucia-auth/adapter-prisma";
import { sveltekit } from "lucia/middleware";
import { dev } from "$app/environment";
import { getPrismaClient } from "./prisma";

export const client = getPrismaClient();

// expect error
export const auth = lucia({
	// experimental: {
	// 	debugMode: true,
	// },
	adapter: prisma(client),
	env: dev ? "DEV" : "PROD",
	middleware: sveltekit(),

    getUserAttributes: (data) => {
		return {
			username: data.username,
			name: data.name,
		};
	},
});

export type Auth = typeof auth;