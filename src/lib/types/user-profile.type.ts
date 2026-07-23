/**
 * @module UserProfileType
 * @description This module defines the UserProfile interface, representing the structure of a user's profile information.
 */

/**
 * Represents the user profile information.
 * @interface UserProfile
 * @property {string} uid - The user's unique ID.
 * @property {string} email - The user's email address.
 * @property {boolean} emailVerified - Indicates if the user's email has been verified.
 * @property {string} displayName - The user's display name.
 * @property {string} photoURL - The URL of the user's profile photo.
 * @property {boolean} isAnonymous - Indicates if the user is anonymous.
 * @property {string} providerId - The ID of the authentication provider.
 * @property {string} phoneNumber - The user's phone number.
 * @property {any} providerData - Additional provider-specific data.
 */
export interface UserProfile {
	uid: string;
	email: string;
	emailVerified: boolean;
	displayName: string;
	photoURL: string;
	isAnonymous: boolean;
	providerId: string;
	phoneNumber: string;
	providerData: any;
}
