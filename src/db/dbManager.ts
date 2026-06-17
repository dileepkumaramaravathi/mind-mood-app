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
   */
  public async syncFromFirestore() {
    if (!firestore) return;
    try {
      console.log('Initiating database sync from Cloud Firestore...');
      
      // 1. Sync Users
      const usersSnap = await firestore.collection('users').get();
      usersSnap.forEach((doc: any) => {
        this.data.users[doc.id] = doc.data();
      });

      // 2. Sync Moods
      const moodsSnap = await firestore.collection('moods').get();
      this.data.moods = [];
      moodsSnap.forEach((doc: any) => {
        this.data.moods.push(doc.data());
      });

      // 3. Sync Journals
      const journalsSnap = await firestore.collection('journals').get();
      this.data.journals = [];
      journalsSnap.forEach((doc: any) => {
        this.data.journals.push(doc.data());
      });

      // 4. Sync Chats
      const chatsSnap = await firestore.collection('chats').get();
      this.data.chats = {};
      chatsSnap.forEach((doc: any) => {
        const msg = doc.data();
        if (msg.userId) {
          if (!this.data.chats[msg.userId]) {
            this.data.chats[msg.userId] = [];
          }
          this.data.chats[msg.userId].push({
            id: msg.id,
            sender: msg.sender,
            text: msg.text,
            timestamp: msg.timestamp
          });
        }
      });
      // Sort message indices
      Object.keys(this.data.chats).forEach((userId) => {
        this.data.chats[userId].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      });

      // 5. Sync Community
      const communitySnap = await firestore.collection('community').get();
      this.data.community = [];
      communitySnap.forEach((doc: any) => {
        this.data.community.push(doc.data());
      });

      // 6. Sync Notifications
      const notifSnap = await firestore.collection('notifications').get();
      this.data.notifications = [];
      notifSnap.forEach((doc: any) => {
        this.data.notifications.push(doc.data());
      });

      console.log('Database synced successfully from Cloud Firestore.');
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
        console.error('Firestore user save failed:', e);
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
        console.error('Firestore password update failed:', e);
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
          console.error('Firestore user streak sync failed:', e);
        });
      }
    }

    this.save();

    // Sync Mood creation to Firestore
    if (firestore) {
      firestore.collection('moods').doc(id).set(newMood).catch((e: any) => {
        console.error('Firestore mood save failed:', e);
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
        console.error('Firestore journal save failed:', e);
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
          console.error('Firestore journal delete failed:', e);
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
        console.error('Firestore chat message save failed:', e);
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
        console.error('Firestore community post save failed:', e);
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
        console.error('Firestore community like update failed:', e);
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
        console.error('Firestore notification save failed:', e);
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
          console.error('Firestore notification set read failed:', e);
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
