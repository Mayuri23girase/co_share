import test from 'node:test';
import assert from 'node:assert/strict';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Post from '../src/models/Post.js';
import * as geminiUtil from '../src/utils/gemini.js';

let mongod;
let server;
let baseUrl;

// Shared test variables across steps
let userToken = '';
let userId = '';
let adminToken = '';
let adminId = '';
let draftPostId = '';
let pendingPostId = '';
let approvedPostId = '';

test.before(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test_secret_for_akatsuki_draft_test_suite_2026';
  process.env.JWT_EXPIRES_IN = '1d';

  // Spin up in-memory MongoDB
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);

  // Start Express server on random free port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  if (mongod) {
    await mongod.stop();
  }
});

test('1. Root endpoint returns API welcome info', async () => {
  const res = await fetch(`${baseUrl}/`);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.match(body.message, /Akatsuki's Draft/);
});

test('2. Register normal user sets role to "user" and returns JWT', async () => {
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Nagato Uzumaki',
      email: 'nagato@akatsuki.dev',
      password: 'RinneganPassword123!',
      role: 'admin' // Attempt privilege escalation; server MUST ignore and set 'user'
    })
  });
  const body = await res.json();

  assert.equal(res.status, 201);
  assert.equal(body.success, true);
  assert.ok(body.data.token, 'Token must be present');
  assert.equal(body.data.user.role, 'user', 'Role must default strictly to "user"');
  assert.equal(body.data.user.email, 'nagato@akatsuki.dev');
  assert.equal(body.data.user.password, undefined, 'Password hash must never be returned');

  userToken = body.data.token;
  userId = body.data.user._id;
});

test('3. Register duplicate email returns 409 Conflict', async () => {
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Another Nagato',
      email: 'nagato@akatsuki.dev',
      password: 'DifferentPassword123!'
    })
  });
  const body = await res.json();

  assert.equal(res.status, 409);
  assert.equal(body.success, false);
  assert.match(body.message, /already exists/);
});

test('4. Login with invalid password returns 401 Unauthorized', async () => {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'nagato@akatsuki.dev',
      password: 'WrongPassword999!'
    })
  });
  const body = await res.json();

  assert.equal(res.status, 401);
  assert.equal(body.success, false);
});

test('5. Login with valid credentials returns 200 and JWT', async () => {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'nagato@akatsuki.dev',
      password: 'RinneganPassword123!'
    })
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.ok(body.data.token);
  assert.equal(body.data.user.email, 'nagato@akatsuki.dev');

  // Update token with fresh login
  userToken = body.data.token;
});

test('6. GET /auth/me returns authenticated user profile', async () => {
  const res = await fetch(`${baseUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.user.email, 'nagato@akatsuki.dev');
  assert.equal(body.data.user.role, 'user');
});

test('7. Create post with status "approved" is rejected with 400 Bad Request', async () => {
  const res = await fetch(`${baseUrl}/posts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Hacked Post',
      description: 'Attempting to self-approve a post',
      content: 'This should fail validation.',
      category: 'philosophy',
      status: 'approved'
    })
  });
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.equal(body.success, false);
});

test('8. Create draft post succeeds with status "draft"', async () => {
  const res = await fetch(`${baseUrl}/posts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Peace Through Understanding',
      description: 'An introductory draft on mutual pain and empathy.',
      content: 'True peace can only be achieve when mutual pain is experienced and recognized.',
      category: 'philosophy',
      status: 'draft'
    })
  });
  const body = await res.json();

  assert.equal(res.status, 201);
  assert.equal(body.success, true);
  assert.equal(body.data.post.status, 'draft');
  assert.equal(body.data.post.createdBy._id, userId);

  draftPostId = body.data.post._id;
});

test('9. Create pending post succeeds with status "pending"', async () => {
  const res = await fetch(`${baseUrl}/posts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'The Rain Village Infrastructure',
      description: 'Urban planning and drainage in Amegakure.',
      content: 'Towering pipes and metallic architecture allow Amegakure to endure continuous rainstorms.',
      category: 'architecture',
      status: 'pending'
    })
  });
  const body = await res.json();

  assert.equal(res.status, 201);
  assert.equal(body.success, true);
  assert.equal(body.data.post.status, 'pending');

  pendingPostId = body.data.post._id;
});

test('10. Public GET /posts returns ONLY approved posts (0 posts currently)', async () => {
  const res = await fetch(`${baseUrl}/posts`);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.totalPosts, 0);
  assert.equal(body.data.posts.length, 0);
});

test('11. GET /posts/my-posts returns all user posts (draft + pending)', async () => {
  const res = await fetch(`${baseUrl}/posts/my-posts`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.totalPosts, 2);
  assert.equal(body.data.posts.length, 2);
});

test('12. GET /posts/:id on pending/draft post returns 404 (not approved)', async () => {
  const res = await fetch(`${baseUrl}/posts/${pendingPostId}`);
  const body = await res.json();

  assert.equal(res.status, 404);
  assert.equal(body.success, false);
});

test('13. Regular user attempting to access admin routes receives 403 Forbidden', async () => {
  const res = await fetch(`${baseUrl}/admin/posts/pending`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const body = await res.json();

  assert.equal(res.status, 403);
  assert.equal(body.success, false);
  assert.match(body.message, /Admin role required/);
});

test('14. Seed admin and login as admin', async () => {
  // Create admin user
  const admin = await User.create({
    name: 'Konan Angel',
    email: 'admin@akatsuki.dev',
    password: 'AdminSecurePass123!',
    role: 'admin'
  });
  adminId = admin._id.toString();

  // Login as admin
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@akatsuki.dev',
      password: 'AdminSecurePass123!'
    })
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.data.user.role, 'admin');
  adminToken = body.data.token;
});

test('15. Admin GET /admin/posts/pending lists pending posts', async () => {
  const res = await fetch(`${baseUrl}/admin/posts/pending`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.totalPosts, 1);
  assert.equal(body.data.posts[0]._id, pendingPostId);
});

test('16. Admin approves pending post -> status becomes "approved"', async () => {
  const res = await fetch(`${baseUrl}/admin/posts/approve/${pendingPostId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.post.status, 'approved');

  approvedPostId = pendingPostId;
});

test('17. Admin re-approving an already approved post fails with 400 Bad Request', async () => {
  const res = await fetch(`${baseUrl}/admin/posts/approve/${approvedPostId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.equal(body.success, false);
  assert.match(body.message, /Only pending posts can be approved/);
});

test('18. Public GET /posts now shows the approved post', async () => {
  const res = await fetch(`${baseUrl}/posts`);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.data.totalPosts, 1);
  assert.equal(body.data.posts[0]._id, approvedPostId);
  assert.equal(body.data.posts[0].status, 'approved');
});

test('19. Public GET /posts/:id retrieves the approved post', async () => {
  const res = await fetch(`${baseUrl}/posts/${approvedPostId}`);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.data.post._id, approvedPostId);
  assert.equal(body.data.post.status, 'approved');
});

test('20. Editing an approved post resets its status to "draft"', async () => {
  const res = await fetch(`${baseUrl}/posts/${approvedPostId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'The Rain Village Infrastructure - Edited Edition'
      // No status provided; server must reset approved status to 'draft'
    })
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.data.post.status, 'draft', 'Status of edited approved post must reset to draft');

  // Verify that GET /posts now has 0 approved posts again
  const feedRes = await fetch(`${baseUrl}/posts`);
  const feedBody = await feedRes.json();
  assert.equal(feedBody.data.totalPosts, 0);
});

test('21. AI improve creates a NEW draft post, preserving the original untouched', async () => {
  // Mock improvePostContent on geminiService in utils/gemini.js
  const originalImprovePostContent = geminiUtil.geminiService.improvePostContent;
  const mockImproved = {
    title: 'Architectural Resilience in Amegakure: Advanced Engineering Patterns',
    description: 'An authoritative study on industrial drainage and structural longevity.',
    content: 'Amegakure stands as a triumph of high-durability hydraulic civil engineering...'
  };

  geminiUtil.geminiService.improvePostContent = async () => mockImproved;

  try {
    const originalPostBefore = await Post.findById(draftPostId);

    const res = await fetch(`${baseUrl}/ai/improve/${draftPostId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` }
    });
    const body = await res.json();

    assert.equal(res.status, 201);
    assert.equal(body.success, true);
    assert.equal(body.data.originalPostId, draftPostId);

    const newDraft = body.data.improvedDraft;
    assert.notEqual(newDraft._id, draftPostId, 'New post must have a different _id');
    assert.equal(newDraft.title, mockImproved.title);
    assert.equal(newDraft.description, mockImproved.description);
    assert.equal(newDraft.content, mockImproved.content);
    assert.equal(newDraft.status, 'draft');
    assert.equal(newDraft.category, originalPostBefore.category);

    // Verify original post remains strictly untouched
    const originalPostAfter = await Post.findById(draftPostId);
    assert.equal(originalPostAfter.title, originalPostBefore.title);
    assert.equal(originalPostAfter.description, originalPostBefore.description);
    assert.equal(originalPostAfter.content, originalPostBefore.content);
    assert.equal(originalPostAfter.status, originalPostBefore.status);
  } finally {
    geminiUtil.geminiService.improvePostContent = originalImprovePostContent;
  }
});

test('22. Non-owner cannot modify or delete another user\'s post', async () => {
  // Create a second user
  const otherUser = await User.create({
    name: 'Deidara Artist',
    email: 'deidara@akatsuki.dev',
    password: 'ExplosionArt123!',
    role: 'user'
  });

  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'deidara@akatsuki.dev',
      password: 'ExplosionArt123!'
    })
  });
  const loginBody = await loginRes.json();
  const otherToken = loginBody.data.token;

  // Attempt to update Nagato's post
  const updateRes = await fetch(`${baseUrl}/posts/${draftPostId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${otherToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title: 'Art is an Explosion' })
  });
  assert.equal(updateRes.status, 403);

  // Attempt to delete Nagato's post
  const deleteRes = await fetch(`${baseUrl}/posts/${draftPostId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${otherToken}` }
  });
  assert.equal(deleteRes.status, 403);

  // Attempt to run AI improve on Nagato's post
  const aiRes = await fetch(`${baseUrl}/ai/improve/${draftPostId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${otherToken}` }
  });
  assert.equal(aiRes.status, 403);
});

test('23. Owner deletes own post successfully', async () => {
  const res = await fetch(`${baseUrl}/posts/${draftPostId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.success, true);

  // Confirm post no longer exists
  const postInDb = await Post.findById(draftPostId);
  assert.equal(postInDb, null);
});
