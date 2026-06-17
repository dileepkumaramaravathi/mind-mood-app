/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { User, Mood, JournalEntry, MoodType, ChatMessage, CommunityItem, NotificationItem } from '../types';

const DB_FILE = path.join(process.cwd(), 'data_store.json');

interface UserRecord extends User {
  passwordHash: string;
  passwordSalt: string;
}

interface DatabaseSchema {
  users: { [id: string]: UserRecord };
  moods: Mood[];
  journals: JournalEntry[];
  chats: { [userId: string]: ChatMessage[] };
  community: CommunityItem[];
  notifications: NotificationItem[];
}

// Global Firebase Firestore reference
let firestore: any = null;

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    let app;
    const apps = getApps();
    if (apps.length === 0) {
      app = initializeApp({
        projectId: config.projectId,
      });
    } else {
      app = apps[0];
    }
    // Initialize firestore with the custom DB ID from AI Studio setup
    firestore = getFirestore(app, config.firestoreDatabaseId || '(default)');
    console.log('Firebase Admin SDK initialized successfully with DB ID:', config.firestoreDatabaseId);
  } else {
    console.warn('firebase-applet-config.json not found, falling back to local memory database.');
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin, using local JSON fallback:', error);
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, userId?: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: userId || null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
    }
  };
  const stringified = JSON.stringify(errInfo);
  console.warn('Firestore Operation Warning (Local JSON serving as source-of-truth):', stringified);
  // Log the warning but do NOT throw to ensure backend never fails/crashes
}

class DBManager {
  private data: DatabaseSchema = {
    users: {},
    moods: [],
    journals: [],
    chats: {},
    community: [],
    notifications: [],
  };

  private resetCodes: { [email: string]: string } = {};

  constructor() {
    this.load();
    this.syncFromFirestore();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const contents = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(contents);
        
        if (!this.data.community) this.data.community = [];
        if (!this.data.notifications) this.data.notifications = [];
      } else {
        this.save();
      }
    } catch (e) {
      console.error('Failed to load database, using empty schema', e);
      this.data = {
        users: {},
        moods: [],
        journals: [],
        chats: {},
        community: [],
        notifications: [],
      };
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save database', e);
    }
  }

  /**
   * Syncs entire dataset asynchronously from Cloud Firestore on backend start.
   * Performs a robust two-way merge so existing local data gets safely uploaded
   * if Firestore was empty, and Firestore data gets fetched if present.
   */
  public async syncFromFirestore() {
    if (!firestore) return;
    try {
      console.log('Initiating database sync from Cloud Firestore...');
      
      // 1. Sync Users
      const firestoreUsers: { [id: string]: UserRecord } = {};
      const usersSnap = await firestore.collection('users').get();
      usersSnap.forEach((doc: any) => {
        firestoreUsers[doc.id] = doc.data() as UserRecord;
      });

      // Upload local users that don't exist in Firestore
      for (const [id, localUser] of Object.entries(this.data.users)) {
        if (!firestoreUsers[id]) {
          console.log(`Syncing user to Firestore: ${localUser.email}`);
          await firestore.collection('users').doc(id).set(localUser).catch((err: any) => {
            console.error(`Error uploading user ${id}:`, err);
          });
          firestoreUsers[id] = localUser;
        }
      }
      this.data.users = firestoreUsers;

      // 2. Sync Moods
      const firestoreMoods: Mood[] = [];
      const firestoreMoodsIds = new Set<string>();
      const moodsSnap = await firestore.collection('moods').get();
      moodsSnap.forEach((doc: any) => {
        const item = doc.data() as Mood;
        firestoreMoods.push(item);
        if (item.id) firestoreMoodsIds.add(item.id);
      });

      // Upload local moods that don't exist in Firestore
      for (const localMood of this.data.moods) {
        if (localMood.id && !firestoreMoodsIds.has(localMood.id)) {
          console.log(`Syncing mood to Firestore: ${localMood.id}`);
          await firestore.collection('moods').doc(localMood.id).set(localMood).catch((err: any) => {
            console.error(`Error uploading mood ${localMood.id}:`, err);
          });
          firestoreMoods.push(localMood);
          firestoreMoodsIds.add(localMood.id);
        }
      }
      this.data.moods = firestoreMoods;

      // 3. Sync Journals
      const firestoreJournals: JournalEntry[] = [];
      const firestoreJournalsIds = new Set<string>();
      const journalsSnap = await firestore.collection('journals').get();
      journalsSnap.forEach((doc: any) => {
        const item = doc.data() as JournalEntry;
        firestoreJournals.push(item);
        if (item.id) firestoreJournalsIds.add(item.id);
      });

      // Upload local journals that don't exist in Firestore
      for (const localJournal of this.data.journals) {
        if (localJournal.id && !firestoreJournalsIds.has(localJournal.id)) {
          console.log(`Syncing journal to Firestore: ${localJournal.id}`);
          await firestore.collection('journals').doc(localJournal.id).set(localJournal).catch((err: any) => {
            console.error(`Error uploading journal ${localJournal.id}:`, err);
          });
          firestoreJournals.push(localJournal);
          firestoreJournalsIds.add(localJournal.id);
        }
      }
      this.data.journals = firestoreJournals;

      // 4. Sync Chats
      const firestoreChats: { [userId: string]: ChatMessage[] } = {};
      const firestoreChatIds = new Set<string>();
      const chatsSnap = await firestore.collection('chats').get();
      chatsSnap.forEach((doc: any) => {
        const msg = doc.data();
        if (msg.userId && msg.id) {
          firestoreChatIds.add(msg.id);
          if (!firestoreChats[msg.userId]) {
            firestoreChats[msg.userId] = [];
          }
          firestoreChats[msg.userId].push({
            id: msg.id,
            sender: msg.sender,
            text: msg.text,
            timestamp: msg.timestamp
          });
        }
      });

      // Upload local chats that don't exist in Firestore
      for (const [userId, messages] of Object.entries(this.data.chats)) {
        for (const localMsg of messages) {
          if (localMsg.id && !firestoreChatIds.has(localMsg.id)) {
            console.log(`Syncing chat message to Firestore: ${localMsg.id}`);
            await firestore.collection('chats').doc(localMsg.id).set({
              ...localMsg,
              userId
            }).catch((err: any) => {
              console.error(`Error uploading chat message ${localMsg.id}:`, err);
            });
            if (!firestoreChats[userId]) {
              firestoreChats[userId] = [];
            }
            firestoreChats[userId].push(localMsg);
            firestoreChatIds.add(localMsg.id);
          }
        }
      }
      this.data.chats = firestoreChats;

      // Sort message indices by timestamp
      Object.keys(this.data.chats).forEach((userId) => {
        this.data.chats[userId].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      });

      // 5. Sync Community
      const firestoreCommunity: CommunityItem[] = [];
      const firestoreCommunityIds = new Set<string>();
      const communitySnap = await firestore.collection('community').get();
      communitySnap.forEach((doc: any) => {
        const item = doc.data() as CommunityItem;
        firestoreCommunity.push(item);
        if (item.id) firestoreCommunityIds.add(item.id);
      });

      // Upload local community posts that don't exist in Firestore
      for (const localPost of this.data.community) {
        if (localPost.id && !firestoreCommunityIds.has(localPost.id)) {
          console.log(`Syncing community post to Firestore: ${localPost.id}`);
          await firestore.collection('community').doc(localPost.id).set(localPost).catch((err: any) => {
            console.error(`Error uploading post ${localPost.id}:`, err);
          });
          firestoreCommunity.push(localPost);
          firestoreCommunityIds.add(localPost.id);
        }
      }
      this.data.community = firestoreCommunity;

      // 6. Sync Notifications
      const firestoreNotifs: NotificationItem[] = [];
      const firestoreNotifIds = new Set<string>();
      const notifSnap = await firestore.collection('notifications').get();
      notifSnap.forEach((doc: any) => {
        const item = doc.data() as NotificationItem;
        firestoreNotifs.push(item);
        if (item.id) firestoreNotifIds.add(item.id);
      });

      // Upload local notifications that don't exist in Firestore
      for (const localNotif of this.data.notifications) {
        if (localNotif.id && !firestoreNotifIds.has(localNotif.id)) {
          console.log(`Syncing notification to Firestore: ${localNotif.id}`);
          await firestore.collection('notifications').doc(localNotif.id).set(localNotif).catch((err: any) => {
            console.error(`Error uploading notification ${localNotif.id}:`, err);
          });
          firestoreNotifs.push(localNotif);
          firestoreNotifIds.add(localNotif.id);
        }
      }
      this.data.notifications = firestoreNotifs;

      console.log('Database synced successfully (two-way merge) from Cloud Firestore.');
      this.save(); // Back up in local data_store.json
    } catch (error) {
      console.error('Failed to sync from Firestore. Falling back to local data:', error);
    }
  }

  // Password Utility using Native Crypto
  private hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  }

  // --- Auth Methods ---
  public register(name: string, email: string, password: string): { user: User; token: string } | null {
    const emailLower = email.toLowerCase().trim();
    
    // Check if user exists
    const exists = Object.values(this.data.users).some((u) => u.email === emailLower);
    if (exists) return null;

    const id = crypto.randomUUID();
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(password, salt);

    const userRecord: UserRecord = {
      id,
      name: name.trim(),
      email: emailLower,
      moodStreak: 0,
      createdAt: new Date().toISOString(),
      passwordHash,
      passwordSalt: salt,
    };

    this.data.users[id] = userRecord;
    this.save();

    // Sync to Firestore asynchronously
    if (firestore) {
      firestore.collection('users').doc(id).set(userRecord).catch((e: any) => {
        handleFirestoreError(e, OperationType.CREATE, `users/${id}`, id);
      });
    }

    return {
      user: {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        moodStreak: userRecord.moodStreak,
        lastActiveDate: userRecord.lastActiveDate,
        createdAt: userRecord.createdAt,
      },
      token: userRecord.id,
    };
  }

  public login(email: string, password: string): { user: User; token: string } | null {
    const emailLower = email.toLowerCase().trim();
    const userRecord = Object.values(this.data.users).find((u) => u.email === emailLower);
    
    if (!userRecord) return null;

    const hash = this.hashPassword(password, userRecord.passwordSalt);
    if (hash !== userRecord.passwordHash) return null;

    return {
      user: {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        moodStreak: userRecord.moodStreak,
        lastActiveDate: userRecord.lastActiveDate,
        createdAt: userRecord.createdAt,
      },
      token: userRecord.id,
    };
  }

  public getUser(id: string): User | null {
    const record = this.data.users[id];
    if (!record) return null;
    return {
      id: record.id,
      name: record.name,
      email: record.email,
      moodStreak: record.moodStreak,
      lastActiveDate: record.lastActiveDate,
      createdAt: record.createdAt,
    };
  }

  public generateResetCode(email: string): string | null {
    const emailLower = email.toLowerCase().trim();
    const exists = Object.values(this.data.users).some((u) => u.email === emailLower);
    if (!exists) return null;

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    this.resetCodes[emailLower] = code;
    return code;
  }

  public verifyResetCode(email: string, code: string): boolean {
    const emailLower = email.toLowerCase().trim();
    return this.resetCodes[emailLower] === code;
  }

  public clearResetCode(email: string): void {
    const emailLower = email.toLowerCase().trim();
    delete this.resetCodes[emailLower];
  }

  public resetPasswordByEmail(email: string, newPassword: string): boolean {
    const emailLower = email.toLowerCase().trim();
    const userRecord = Object.values(this.data.users).find((u) => u.email === emailLower);
    if (!userRecord) return false;

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(newPassword, salt);

    userRecord.passwordSalt = salt;
    userRecord.passwordHash = passwordHash;
    this.save();

    // Sync updated keys to Firestore
    if (firestore) {
      firestore.collection('users').doc(userRecord.id).set(userRecord, { merge: true }).catch((e: any) => {
        handleFirestoreError(e, OperationType.UPDATE, `users/${userRecord.id}`, userRecord.id);
      });
    }

    return true;
  }

  // --- Mood Methods ---
  public addMood(userId: string, moodType: MoodType, intensity: number, note: string): Mood {
    const id = crypto.randomUUID();
    const todayStr = new Date().toISOString().split('T')[0];

    const newMood: Mood = {
      id,
      userId,
      moodType,
      intensity,
      note: note.trim(),
      date: todayStr,
      createdAt: new Date().toISOString(),
    };

    this.data.moods.push(newMood);

    // Update streak logic
    const user = this.data.users[userId];
    if (user) {
      const yesterdayStr = this.getYesterdayString();
      const lastActive = user.lastActiveDate;

      if (!lastActive) {
        user.moodStreak = 1;
      } else if (lastActive === yesterdayStr) {
        user.moodStreak += 1;
      } else if (lastActive === todayStr) {
        // Unchanged
      } else {
        user.moodStreak = 1;
      }
      user.lastActiveDate = todayStr;

      // Sync user object update
      if (firestore) {
        firestore.collection('users').doc(userId).set(user, { merge: true }).catch((e: any) => {
          handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`, userId);
        });
      }
    }

    this.save();

    // Sync Mood creation to Firestore
    if (firestore) {
      firestore.collection('moods').doc(id).set(newMood).catch((e: any) => {
        handleFirestoreError(e, OperationType.CREATE, `moods/${id}`, userId);
      });
    }

    return newMood;
  }

  private getYesterdayString(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }

  public getTodayMood(userId: string): Mood | null {
    const todayStr = new Date().toISOString().split('T')[0];
    const found = this.data.moods.find((m) => m.userId === userId && m.date === todayStr);
    return found || null;
  }

  public getMoodHistory(userId: string): Mood[] {
    return this.data.moods
      .filter((m) => m.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // --- Journal Methods ---
  public addJournal(userId: string, text: string, moodTag: MoodType): JournalEntry {
    const id = crypto.randomUUID();
    const newEntry: JournalEntry = {
      id,
      userId,
      text: text.trim(),
      moodTag,
      createdAt: new Date().toISOString(),
    };

    this.data.journals.push(newEntry);
    this.save();

    // Sync to Firestore
    if (firestore) {
      firestore.collection('journals').doc(id).set(newEntry).catch((e: any) => {
        handleFirestoreError(e, OperationType.CREATE, `journals/${id}`, userId);
      });
    }

    return newEntry;
  }

  public getAllJournals(userId: string): JournalEntry[] {
    return this.data.journals
      .filter((j) => j.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public deleteJournal(userId: string, journalId: string): boolean {
    const initialLen = this.data.journals.length;
    this.data.journals = this.data.journals.filter((j) => !(j.id === journalId && j.userId === userId));
    const deleted = this.data.journals.length < initialLen;
    if (deleted) {
      this.save();

      // Sync deletion
      if (firestore) {
        firestore.collection('journals').doc(journalId).delete().catch((e: any) => {
          handleFirestoreError(e, OperationType.DELETE, `journals/${journalId}`, userId);
        });
      }
    }
    return deleted;
  }

  // --- Chat Helper Memory ---
  public getChatHistory(userId: string): ChatMessage[] {
    return this.data.chats[userId] || [];
  }

  public saveChatMessage(userId: string, sender: 'user' | 'ai', text: string): ChatMessage {
    if (!this.data.chats[userId]) {
      this.data.chats[userId] = [];
    }
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender,
      text,
      timestamp: new Date().toISOString(),
    };
    
    this.data.chats[userId].push(newMessage);
    if (this.data.chats[userId].length > 40) {
      this.data.chats[userId] = this.data.chats[userId].slice(-40);
    }
    
    this.save();

    // Sync Chat item to Firestore
    if (firestore) {
      firestore.collection('chats').doc(newMessage.id).set({
        ...newMessage,
        userId
      }).catch((e: any) => {
        handleFirestoreError(e, OperationType.CREATE, `chats/${newMessage.id}`, userId);
      });
    }

    return newMessage;
  }

  public clearChatHistory(userId: string): void {
    this.data.chats[userId] = [];
    this.save();

    // Sync batch deletion
    if (firestore) {
      firestore.collection('chats').where('userId', '==', userId).get()
        .then((snapshot: any) => {
          const batch = firestore.batch();
          snapshot.forEach((doc: any) => {
            batch.delete(doc.ref);
          });
          return batch.commit();
        })
        .catch((e: any) => {
          console.error('Firestore chats clear failed:', e);
        });
    }
  }

  // --- Community Affirmation Methods ---
  public getCommunityPosts(): CommunityItem[] {
    return (this.data.community || []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public addCommunityPost(userId: string, authorName: string, text: string, bgGradient: string): CommunityItem {
    const id = crypto.randomUUID();
    const newPost: CommunityItem = {
      id,
      userId,
      authorName: authorName.trim() || 'Anonymous Companion',
      text: text.trim(),
      bgGradient: bgGradient || 'from-violet-600 to-indigo-600',
      likes: [],
      createdAt: new Date().toISOString(),
    };

    if (!this.data.community) {
      this.data.community = [];
    }
    this.data.community.push(newPost);
    this.save();

    // Sync to Firestore
    if (firestore) {
      firestore.collection('community').doc(id).set(newPost).catch((e: any) => {
        handleFirestoreError(e, OperationType.CREATE, `community/${id}`, userId);
      });
    }

    return newPost;
  }

  public toggleLikePost(userId: string, postId: string): CommunityItem | null {
    if (!this.data.community) this.data.community = [];
    const post = this.data.community.find((p) => p.id === postId);
    if (!post) return null;

    if (!post.likes) post.likes = [];
    const idx = post.likes.indexOf(userId);
    if (idx !== -1) {
      post.likes.splice(idx, 1);
    } else {
      post.likes.push(userId);
    }
    this.save();

    // Sync to Firestore
    if (firestore) {
      firestore.collection('community').doc(postId).set({
        likes: post.likes
      }, { merge: true }).catch((e: any) => {
        handleFirestoreError(e, OperationType.UPDATE, `community/${postId}`, userId);
      });
    }

    return post;
  }

  // --- Notification Methods ---
  public getNotifications(userId: string): NotificationItem[] {
    if (!this.data.notifications) this.data.notifications = [];
    return this.data.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public addNotification(
    userId: string,
    title: string,
    message: string,
    type: 'system' | 'milestone' | 'support' | 'report'
  ): NotificationItem {
    const id = crypto.randomUUID();
    const newNotif: NotificationItem = {
      id,
      userId,
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString(),
    };

    if (!this.data.notifications) {
      this.data.notifications = [];
    }
    this.data.notifications.push(newNotif);
    this.save();

    // Sync to Firestore
    if (firestore) {
      firestore.collection('notifications').doc(id).set(newNotif).catch((e: any) => {
        handleFirestoreError(e, OperationType.CREATE, `notifications/${id}`, userId);
      });
    }

    return newNotif;
  }

  public markNotificationRead(userId: string, id: string): boolean {
    if (!this.data.notifications) this.data.notifications = [];
    const notif = this.data.notifications.find((n) => n.id === id && n.userId === userId);
    if (notif) {
      notif.read = true;
      this.save();

      // Sync to Firestore
      if (firestore) {
        firestore.collection('notifications').doc(id).set({
          read: true
        }, { merge: true }).catch((e: any) => {
          handleFirestoreError(e, OperationType.UPDATE, `notifications/${id}`, userId);
        });
      }

      return true;
    }
    return false;
  }

  public clearAllNotifications(userId: string): void {
    if (!this.data.notifications) this.data.notifications = [];
    this.data.notifications = this.data.notifications.filter((n) => n.userId !== userId);
    this.save();

    // Sync batch deletion
    if (firestore) {
      firestore.collection('notifications').where('userId', '==', userId).get()
        .then((snapshot: any) => {
          const batch = firestore.batch();
          snapshot.forEach((doc: any) => {
            batch.delete(doc.ref);
          });
          return batch.commit();
        })
        .catch((e: any) => {
          console.error('Firestore notifications clear failed:', e);
        });
    }
  }
}

export const db = new DBManager();
