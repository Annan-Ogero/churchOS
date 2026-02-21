import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  try {
    console.log("Starting server...");
    const db = new Database("churchos.db");
    
    // Initialize Database Schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS churches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS branches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        church_id INTEGER,
        name TEXT NOT NULL,
        location TEXT,
        FOREIGN KEY(church_id) REFERENCES churches(id)
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT CHECK(role IN ('super_admin', 'branch_admin', 'group_leader', 'member')) NOT NULL,
        branch_id INTEGER,
        FOREIGN KEY(branch_id) REFERENCES branches(id)
      );

      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        branch_id INTEGER,
        name TEXT NOT NULL,
        type TEXT,
        description TEXT,
        meeting_url TEXT,
        FOREIGN KEY(branch_id) REFERENCES branches(id)
      );

      CREATE TABLE IF NOT EXISTS group_members (
        user_id INTEGER,
        group_id INTEGER,
        role_in_group TEXT,
        PRIMARY KEY(user_id, group_id),
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(group_id) REFERENCES groups(id)
      );

      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        branch_id INTEGER,
        group_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        start_time DATETIME,
        location TEXT,
        meeting_url TEXT,
        meeting_notes TEXT,
        ai_summary TEXT,
        FOREIGN KEY(branch_id) REFERENCES branches(id),
        FOREIGN KEY(group_id) REFERENCES groups(id)
      );

      CREATE TABLE IF NOT EXISTS meeting_attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER,
        user_id INTEGER,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(event_id) REFERENCES events(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER,
        sender_id INTEGER,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(group_id) REFERENCES groups(id),
        FOREIGN KEY(sender_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS prayer_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        branch_id INTEGER,
        content TEXT NOT NULL,
        is_anonymous INTEGER DEFAULT 0,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(branch_id) REFERENCES branches(id)
      );

      CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER,
        branch_id INTEGER,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT CHECK(type IN ('church', 'branch')) NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(sender_id) REFERENCES users(id),
        FOREIGN KEY(branch_id) REFERENCES branches(id)
      );

      CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        church_id INTEGER,
        branch_id INTEGER,
        group_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        target_amount REAL,
        deadline DATETIME,
        visibility_policy TEXT CHECK(visibility_policy IN ('private', 'participants', 'full')) DEFAULT 'private',
        status TEXT DEFAULT 'active',
        FOREIGN KEY(church_id) REFERENCES churches(id),
        FOREIGN KEY(branch_id) REFERENCES branches(id),
        FOREIGN KEY(group_id) REFERENCES groups(id)
      );

      CREATE TABLE IF NOT EXISTS contributions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        campaign_id INTEGER,
        amount REAL NOT NULL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        method TEXT,
        recorded_by INTEGER,
        status TEXT DEFAULT 'verified',
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(campaign_id) REFERENCES campaigns(id),
        FOREIGN KEY(recorded_by) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id INTEGER,
        details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS invitations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        branch_id INTEGER,
        role TEXT NOT NULL,
        created_by INTEGER,
        expires_at DATETIME,
        used_at DATETIME,
        FOREIGN KEY(branch_id) REFERENCES branches(id),
        FOREIGN KEY(created_by) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS volunteer_needs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        branch_id INTEGER,
        event_id INTEGER,
        role_name TEXT NOT NULL,
        description TEXT,
        required_count INTEGER DEFAULT 1,
        deadline DATETIME,
        status TEXT DEFAULT 'open',
        FOREIGN KEY(branch_id) REFERENCES branches(id),
        FOREIGN KEY(event_id) REFERENCES events(id)
      );

      CREATE TABLE IF NOT EXISTS volunteer_signups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        need_id INTEGER,
        user_id INTEGER,
        signed_up_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'confirmed',
        FOREIGN KEY(need_id) REFERENCES volunteer_needs(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
    `);

    // Seed Initial Data if empty
    const churchCount = db.prepare("SELECT COUNT(*) as count FROM churches").get() as { count: number };
    if (churchCount.count === 0) {
      const churchId = db.prepare("INSERT INTO churches (name) VALUES (?)").run("Grace Community Church").lastInsertRowid;
      const branchId = db.prepare("INSERT INTO branches (church_id, name, location) VALUES (?, ?, ?)").run(churchId, "Main Campus", "Downtown").lastInsertRowid;
      
      const superAdminId = db.prepare("INSERT INTO users (name, email, role, branch_id) VALUES (?, ?, ?, ?)").run("John Doe", "admin@church.org", "super_admin", branchId).lastInsertRowid;
      const leaderId = db.prepare("INSERT INTO users (name, email, role, branch_id) VALUES (?, ?, ?, ?)").run("Jane Smith", "jane@church.org", "group_leader", branchId).lastInsertRowid;
      const memberId = db.prepare("INSERT INTO users (name, email, role, branch_id) VALUES (?, ?, ?, ?)").run("Bob Wilson", "bob@church.org", "member", branchId).lastInsertRowid;

      const groupId = db.prepare("INSERT INTO groups (branch_id, name, type, description, meeting_url) VALUES (?, ?, ?, ?, ?)").run(branchId, "Worship Team", "Ministry", "Praise and worship coordination", "https://meet.google.com/abc-defg-hij").lastInsertRowid;
      db.prepare("INSERT INTO group_members (user_id, group_id, role_in_group) VALUES (?, ?, ?)").run(leaderId, groupId, "Leader");
      db.prepare("INSERT INTO group_members (user_id, group_id, role_in_group) VALUES (?, ?, ?)").run(memberId, groupId, "Vocalist");

      db.prepare("INSERT INTO messages (group_id, sender_id, content) VALUES (?, ?, ?)").run(groupId, leaderId, "Hi team, rehearsal is at 6 PM tomorrow!");
      db.prepare("INSERT INTO events (branch_id, group_id, title, description, start_time, location, meeting_url) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(branchId, groupId, "Sunday Service", "Weekly worship service", "2026-02-22 09:00:00", "Main Sanctuary", "https://meet.google.com/xyz-pdq-rst");

      db.prepare("INSERT INTO announcements (sender_id, branch_id, title, content, type) VALUES (?, ?, ?, ?, ?)")
        .run(superAdminId, null, "Welcome to ChurchOS", "We are excited to launch our new unified platform!", "church");

      // Seed Campaigns
      const campaignId = db.prepare("INSERT INTO campaigns (church_id, title, description, target_amount, deadline, visibility_policy) VALUES (?, ?, ?, ?, ?, ?)")
        .run(churchId, "Building Project 2026", "Expanding our main sanctuary to accommodate more members.", 50000, "2026-12-31", "participants").lastInsertRowid;
      
      db.prepare("INSERT INTO campaigns (church_id, branch_id, title, description, target_amount, deadline, visibility_policy) VALUES (?, ?, ?, ?, ?, ?)")
        .run(churchId, branchId, "Youth Camp Fund", "Sending 50 youths to the annual summer camp.", 5000, "2026-06-01", "full");

      // Seed Contributions
      db.prepare("INSERT INTO contributions (user_id, campaign_id, amount, method, recorded_by) VALUES (?, ?, ?, ?, ?)")
        .run(memberId, campaignId, 500, "Bank Transfer", superAdminId);
      db.prepare("INSERT INTO contributions (user_id, campaign_id, amount, method, recorded_by) VALUES (?, ?, ?, ?, ?)")
        .run(leaderId, campaignId, 1000, "Cash", superAdminId);

      // Seed Volunteer Needs
      const upcomingEvent = db.prepare("SELECT id FROM events LIMIT 1").get() as { id: number };
      if (upcomingEvent) {
        db.prepare("INSERT INTO volunteer_needs (branch_id, event_id, role_name, description, required_count) VALUES (?, ?, ?, ?, ?)")
          .run(branchId, upcomingEvent.id, "Greeter", "Welcome members at the main entrance", 2);
        db.prepare("INSERT INTO volunteer_needs (branch_id, event_id, role_name, description, required_count) VALUES (?, ?, ?, ?, ?)")
          .run(branchId, upcomingEvent.id, "Coffee Station", "Prepare and serve coffee before service", 1);
        db.prepare("INSERT INTO volunteer_needs (branch_id, event_id, role_name, description, required_count) VALUES (?, ?, ?, ?, ?)")
          .run(branchId, upcomingEvent.id, "Tech Booth", "Operate slides and sound board", 1);
      }
    }

    const app = express();
    const server = createServer(app);
    const wss = new WebSocketServer({ server });
    const PORT = 3000;

    app.use(express.json());

    // WebSocket logic
    const clients = new Map<number, Set<WebSocket>>(); // groupId -> Set of sockets

    wss.on('connection', (ws, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const groupId = parseInt(url.searchParams.get('groupId') || '0');
      
      if (groupId) {
        if (!clients.has(groupId)) clients.set(groupId, new Set());
        clients.get(groupId)?.add(ws);
        
        ws.on('close', () => {
          clients.get(groupId)?.delete(ws);
        });
      }
    });

    const broadcastToGroup = (groupId: number, data: any) => {
      const groupClients = clients.get(groupId);
      if (groupClients) {
        const payload = JSON.stringify(data);
        groupClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
          }
        });
      }
    };

    // API Routes
    app.get("/api/me", (req, res) => {
      const user = db.prepare("SELECT * FROM users WHERE email = ?").get("admin@church.org");
      res.json(user);
    });

    app.get("/api/branches", (req, res) => {
      const { role, branch_id } = req.query;
      let query = "SELECT * FROM branches";
      const params: any[] = [];
      if (role !== 'super_admin') {
        query += " WHERE id = ?";
        params.push(branch_id);
      }
      const branches = db.prepare(query).all(...params);
      res.json(branches);
    });

    app.get("/api/groups", (req, res) => {
      const { branch_id, role } = req.query;
      let query = `
        SELECT g.*, b.name as branch_name, 
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
        FROM groups g
        JOIN branches b ON g.branch_id = b.id
      `;
      const params: any[] = [];
      if (role !== 'super_admin') {
        query += " WHERE g.branch_id = ?";
        params.push(branch_id);
      }
      const groups = db.prepare(query).all(...params);
      res.json(groups);
    });

    app.get("/api/groups/:id", (req, res) => {
      const { user_id, role } = req.query;
      const groupId = req.params.id;
      const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId);
      const isMember = db.prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?").get(groupId, user_id);
      const members = db.prepare(`
        SELECT u.id, u.name, u.role, gm.role_in_group
        FROM group_members gm
        JOIN users u ON gm.user_id = u.id
        WHERE gm.group_id = ?
      `).all(groupId);
      let messages = [];
      if (role === 'super_admin' || isMember) {
        messages = db.prepare(`
          SELECT m.*, u.name as sender_name
          FROM messages m
          JOIN users u ON m.sender_id = u.id
          WHERE m.group_id = ?
          ORDER BY m.timestamp ASC
        `).all(groupId);
      }
      res.json({ ...group, members, messages, is_member: !!isMember });
    });

    app.post("/api/messages", (req, res) => {
      const { group_id, sender_id, content } = req.body;
      const result = db.prepare("INSERT INTO messages (group_id, sender_id, content) VALUES (?, ?, ?)").run(group_id, sender_id, content);
      
      const newMessage = db.prepare(`
        SELECT m.*, u.name as sender_name
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.id = ?
      `).get(result.lastInsertRowid);

      broadcastToGroup(group_id, { type: 'NEW_MESSAGE', message: newMessage });
      
      res.json({ id: result.lastInsertRowid });
    });

    app.get("/api/events", (req, res) => {
      const { branch_id, role, user_id } = req.query;
      let query = `
        SELECT e.*, b.name as branch_name, g.name as group_name
        FROM events e
        JOIN branches b ON e.branch_id = b.id
        LEFT JOIN groups g ON e.group_id = g.id
      `;
      const params: any[] = [];
      if (role !== 'super_admin') {
        query += ` WHERE e.branch_id = ? OR e.group_id IN (SELECT group_id FROM group_members WHERE user_id = ?) OR e.group_id IS NULL `;
        params.push(branch_id, user_id);
      }
      query += " ORDER BY e.start_time ASC";
      const events = db.prepare(query).all(...params);
      res.json(events);
    });

    app.get("/api/prayer-requests", (req, res) => {
      const requests = db.prepare(`
        SELECT pr.*, u.name as user_name
        FROM prayer_requests pr
        LEFT JOIN users u ON pr.user_id = u.id
        ORDER BY pr.timestamp DESC
      `).all();
      res.json(requests);
    });

    app.post("/api/prayer-requests", (req, res) => {
      const { user_id, branch_id, content, is_anonymous } = req.body;
      const result = db.prepare("INSERT INTO prayer_requests (user_id, branch_id, content, is_anonymous) VALUES (?, ?, ?, ?)")
        .run(user_id, branch_id, content, is_anonymous ? 1 : 0);
      res.json({ id: result.lastInsertRowid });
    });

    app.get("/api/stats", (req, res) => {
      const { role, branch_id } = req.query;
      let userFilter = ""; let groupFilter = ""; let eventFilter = ""; let branchFilter = "";
      const params: any[] = [];
      if (role !== 'super_admin') {
        userFilter = " WHERE branch_id = ?"; groupFilter = " WHERE branch_id = ?"; eventFilter = " WHERE branch_id = ?"; branchFilter = " WHERE id = ?";
        params.push(branch_id);
      }
      const memberCount = db.prepare(`SELECT COUNT(*) as count FROM users ${userFilter}`).get(...params) as any;
      const groupCount = db.prepare(`SELECT COUNT(*) as count FROM groups ${groupFilter}`).get(...params) as any;
      const eventCount = db.prepare(`SELECT COUNT(*) as count FROM events ${eventFilter}`).get(...params) as any;
      const branchCount = db.prepare(`SELECT COUNT(*) as count FROM branches ${branchFilter}`).get(...params) as any;
      res.json({ members: memberCount.count, groups: groupCount.count, events: eventCount.count, branches: branchCount.count });
    });

    app.get("/api/announcements", (req, res) => {
      const { branch_id, role } = req.query;
      let query = `
        SELECT a.*, u.name as sender_name, b.name as branch_name
        FROM announcements a
        JOIN users u ON a.sender_id = u.id
        LEFT JOIN branches b ON a.branch_id = b.id
      `;
      const params: any[] = [];
      if (role !== 'super_admin') {
        query += " WHERE a.type = 'church' OR a.branch_id = ?";
        params.push(branch_id);
      }
      query += " ORDER BY a.timestamp DESC";
      const announcements = db.prepare(query).all(...params);
      res.json(announcements);
    });

    app.post("/api/announcements", (req, res) => {
      const { sender_id, branch_id, title, content, type } = req.body;
      const result = db.prepare("INSERT INTO announcements (sender_id, branch_id, title, content, type) VALUES (?, ?, ?, ?, ?)")
        .run(sender_id, branch_id || null, title, content, type);
      res.json({ id: result.lastInsertRowid });
    });

    app.get("/api/admin/users", (req, res) => {
      const users = db.prepare(`
        SELECT u.*, b.name as branch_name
        FROM users u
        LEFT JOIN branches b ON u.branch_id = b.id
      `).all();
      res.json(users);
    });

    app.post("/api/admin/branches", (req, res) => {
      const { church_id, name, location } = req.body;
      const result = db.prepare("INSERT INTO branches (church_id, name, location) VALUES (?, ?, ?)")
        .run(church_id, name, location);
      res.json({ id: result.lastInsertRowid });
    });

    app.get("/api/campaigns", (req, res) => {
      const campaigns = db.prepare(`
        SELECT c.*, 
        (SELECT SUM(amount) FROM contributions WHERE campaign_id = c.id) as current_amount,
        (SELECT COUNT(DISTINCT user_id) FROM contributions WHERE campaign_id = c.id) as contributor_count
        FROM campaigns c
        ORDER BY c.status ASC, c.deadline ASC
      `).all();
      res.json(campaigns);
    });

    app.get("/api/campaigns/:id/contributions", (req, res) => {
      const { role, user_id } = req.query;
      const campaignId = req.params.id;
      const campaign = db.prepare("SELECT visibility_policy FROM campaigns WHERE id = ?").get(campaignId) as any;
      let query = ` SELECT c.*, u.name as user_name FROM contributions c JOIN users u ON c.user_id = u.id WHERE c.campaign_id = ? `;
      if (role !== 'super_admin' && campaign.visibility_policy === 'private') {
        query += " AND c.user_id = ?";
      }
      query += " ORDER BY c.date DESC";
      const params = role !== 'super_admin' && campaign.visibility_policy === 'private' ? [campaignId, user_id] : [campaignId];
      const contributions = db.prepare(query).all(...params);
      res.json(contributions);
    });

    app.post("/api/contributions", (req, res) => {
      const { user_id, campaign_id, amount, method, recorded_by } = req.body;
      const result = db.prepare("INSERT INTO contributions (user_id, campaign_id, amount, method, recorded_by) VALUES (?, ?, ?, ?, ?)")
        .run(user_id, campaign_id, amount, method, recorded_by);
      res.json({ id: result.lastInsertRowid });
    });

    app.get("/api/me/contributions", (req, res) => {
      const user = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@church.org") as any;
      const contributions = db.prepare(`
        SELECT c.*, cp.title as campaign_title
        FROM contributions c
        JOIN campaigns cp ON c.campaign_id = cp.id
        WHERE c.user_id = ?
        ORDER BY c.date DESC
      `).all(user.id);
      res.json(contributions);
    });

    app.get("/api/stats/branches-comparison", (req, res) => {
      const comparison = db.prepare(`
        SELECT b.name as branch_name,
        SUM(ct.amount) as total_contributed,
        (SELECT SUM(target_amount) FROM campaigns WHERE branch_id = b.id OR branch_id IS NULL) as total_target
        FROM branches b
        LEFT JOIN users u ON u.branch_id = b.id
        LEFT JOIN contributions ct ON ct.user_id = u.id
        GROUP BY b.id
      `).all();
      res.json(comparison);
    });

    app.get("/api/admin/audit-logs", (req, res) => {
      const logs = db.prepare(` SELECT al.*, u.name as user_name FROM audit_logs al JOIN users u ON al.user_id = u.id ORDER BY al.timestamp DESC LIMIT 100 `).all();
      res.json(logs);
    });

    app.post("/api/admin/users/:id/role", (req, res) => {
      const { role, admin_id } = req.body;
      const userId = req.params.id;
      db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
      db.prepare(` INSERT INTO audit_logs (user_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?) `).run(admin_id, "UPDATE_ROLE", "user", userId, `Changed role to ${role}`);
      res.json({ success: true });
    });

    app.get("/api/admin/invitations", (req, res) => {
      const invites = db.prepare(` SELECT i.*, b.name as branch_name, u.name as creator_name FROM invitations i LEFT JOIN branches b ON i.branch_id = b.id JOIN users u ON i.created_by = u.id ORDER BY i.id DESC `).all();
      res.json(invites);
    });

    app.post("/api/admin/invitations", (req, res) => {
      const { branch_id, role, created_by } = req.body;
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      db.prepare(` INSERT INTO invitations (code, branch_id, role, created_by) VALUES (?, ?, ?, ?) `).run(code, branch_id, role, created_by);
      res.json({ code });
    });

    app.post("/api/events/:id/attendance", (req, res) => {
      const { user_id } = req.body;
      const eventId = req.params.id;
      db.prepare("INSERT INTO meeting_attendance (event_id, user_id) VALUES (?, ?)").run(eventId, user_id);
      res.json({ success: true });
    });

    app.post("/api/events/:id/notes", (req, res) => {
      const { notes } = req.body;
      const eventId = req.params.id;
      db.prepare("UPDATE events SET meeting_notes = ? WHERE id = ?").run(notes, eventId);
      res.json({ success: true });
    });

    app.post("/api/events/:id/ai-summary", (req, res) => {
      const { ai_summary } = req.body;
      const eventId = req.params.id;
      db.prepare("UPDATE events SET ai_summary = ? WHERE id = ?").run(ai_summary, eventId);
      res.json({ success: true });
    });

    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
      app.use(vite.middlewares);
    } else {
      app.use(express.static(path.join(__dirname, "dist")));
      app.get("*", (req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));
    }

    app.get("/api/volunteer-needs", (req, res) => {
      const { branch_id } = req.query;
      const needs = db.prepare(`
        SELECT vn.*, e.title as event_title, e.start_time as event_time,
        (SELECT COUNT(*) FROM volunteer_signups WHERE need_id = vn.id) as current_count
        FROM volunteer_needs vn
        LEFT JOIN events e ON vn.event_id = e.id
        WHERE vn.branch_id = ? AND vn.status = 'open'
        ORDER BY e.start_time ASC
      `).all(branch_id);
      res.json(needs);
    });

    app.post("/api/volunteer-signups", (req, res) => {
      const { need_id, user_id } = req.body;
      const result = db.prepare("INSERT INTO volunteer_signups (need_id, user_id) VALUES (?, ?)").run(need_id, user_id);
      res.json({ id: result.lastInsertRowid });
    });

    app.get("/api/my-signups", (req, res) => {
      const { user_id } = req.query;
      const signups = db.prepare(`
        SELECT vs.*, vn.role_name, e.title as event_title, e.start_time as event_time
        FROM volunteer_signups vs
        JOIN volunteer_needs vn ON vs.need_id = vn.id
        JOIN events e ON vn.event_id = e.id
        WHERE vs.user_id = ?
        ORDER BY e.start_time ASC
      `).all(user_id);
      res.json(signups);
    });

    app.post("/api/volunteer-needs", (req, res) => {
      const { branch_id, event_id, role_name, description, required_count, deadline } = req.body;
      const result = db.prepare("INSERT INTO volunteer_needs (branch_id, event_id, role_name, description, required_count, deadline) VALUES (?, ?, ?, ?, ?, ?)")
        .run(branch_id, event_id, role_name, description, required_count, deadline);
      res.json({ id: result.lastInsertRowid });
    });

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("FAILED TO START SERVER:", error);
  }
}

startServer();
