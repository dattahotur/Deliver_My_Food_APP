const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const mongoose = require('mongoose');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());

const PORT = process.env.PORT || 5010;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/foodwaste_delivery_partners';
const USERS_FILE = path.join(__dirname, 'users.json');

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('[DELIVERY-USER-SERVICE] Connected to MongoDB');
    seedDrivers();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Define Delivery Partner Schema
const deliveryPartnerSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'delivery-partner' },
  status: { type: String, default: 'active' },
  verificationStatus: { type: String, default: 'none' },
  verificationDocs: { type: [mongoose.Schema.Types.Mixed], default: [] },
  isOnline: { type: Boolean, default: false },
  availableEarnings: { type: Number, default: 0 },
  ratings: { type: [mongoose.Schema.Types.Mixed], default: [] },
  reports: { type: [mongoose.Schema.Types.Mixed], default: [] },
  warnings: { type: [mongoose.Schema.Types.Mixed], default: [] },
  reportCount: { type: Number, default: 0 },
  vehicleType: { type: String, default: '' },
  vehicleNumber: { type: String, default: '' },
  withdrawals: { type: [mongoose.Schema.Types.Mixed], default: [] },
  notifications: { type: [mongoose.Schema.Types.Mixed], default: [] }
});

const DeliveryPartner = mongoose.model('DeliveryPartner', deliveryPartnerSchema);

// Seed Drivers
const seedDrivers = async () => {
  try {
    const count = await DeliveryPartner.countDocuments();
    if (count === 0) {
      console.log('[DELIVERY-USER-SERVICE] Seeding drivers from JSON file...');
      let initialDrivers = [];
      if (fs.existsSync(USERS_FILE)) {
        initialDrivers = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      } else {
        initialDrivers = [
          {
            id: 1,
            name: "Delivery Admin",
            email: "admin@delivery.com",
            password: "admin123",
            role: "admin",
            status: "active",
            verificationStatus: "verified",
            verificationDocs: [],
            isOnline: false,
            availableEarnings: 0,
            ratings: [],
            reports: [],
            warnings: [],
            reportCount: 0,
            vehicleType: '',
            vehicleNumber: '',
            withdrawals: [],
            notifications: []
          }
        ];
      }
      await DeliveryPartner.insertMany(initialDrivers);
      console.log('[DELIVERY-USER-SERVICE] Seeding completed successfully');
    }
  } catch (err) {
    console.error('[DELIVERY-USER-SERVICE] Seeding error:', err);
  }
};

const syncUserEarnings = (user) => {
  return new Promise((resolve) => {
    http.get(`http://localhost:5003/driver/${user.id}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const orders = JSON.parse(data);
          if (Array.isArray(orders)) {
            const completed = orders.filter(o => o.deliveryStatus === 'delivered' || o.status === 'completed');
            const lifetimeEarnings = completed.reduce((sum, o) => sum + (Number(o.price) || 45.00), 0);
            const totalWithdrawn = (user.withdrawals || []).reduce((sum, w) => sum + Number(w.amount), 0);
            user.availableEarnings = Math.max(0, lifetimeEarnings - totalWithdrawn);
            user.save().then(() => resolve());
            return;
          }
        } catch (err) {
          console.error('[DELIVERY-USER-SERVICE] Error parsing driver orders:', err.message);
        }
        resolve();
      });
    }).on('error', (err) => {
      console.error('[DELIVERY-USER-SERVICE] Error fetching driver orders:', err.message);
      resolve();
    });
  });
};

// Diagnostic logging
app.use((req, res, next) => {
  console.log(`[DELIVERY-USER-SERVICE] ${req.method} ${req.url}`);
  next();
});

// Health
app.get('/health', (req, res) => res.json({ status: 'Delivery User Service Alive', port: PORT }));

// Get all users (non-deleted)
app.get('/', async (req, res) => {
  try {
    const drivers = await DeliveryPartner.find({ status: { $ne: 'deleted' } });
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get all users including deleted
app.get('/admin/all', async (req, res) => {
  try {
    const drivers = await DeliveryPartner.find({});
    res.json(drivers);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get all pending verifications
app.get('/admin/verifications', async (req, res) => {
  try {
    const pending = await DeliveryPartner.find({ verificationStatus: 'pending' });
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Update verification status
app.put('/admin/verify/:id', async (req, res) => {
  const { status } = req.body;
  try {
    const user = await DeliveryPartner.findOne({ id: Number(req.params.id) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.verificationStatus = status;
    await user.save();
    res.json({ message: `User verification ${status}`, user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Get all reports across all users (active users and unresolved reports only)
app.get('/admin/all-reports', async (req, res) => {
  try {
    const drivers = await DeliveryPartner.find({ status: { $ne: 'deleted' } });
    const allReports = [];
    drivers.forEach(u => {
      if (u.reports && u.reports.length > 0) {
        u.reports.forEach(r => {
          if (!r.actionTaken) {
            allReports.push({ ...r, targetUserId: u.id, targetUserName: u.name });
          }
        });
      }
    });
    res.json(allReports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Platform stats
app.get('/admin/stats', async (req, res) => {
  try {
    const active = await DeliveryPartner.find({ status: 'active', role: { $ne: 'admin' } });
    const deleted = await DeliveryPartner.find({ status: 'deleted' });
    const drivers = active.filter(u => u.role === 'delivery-partner');
    res.json({
      totalUsers: active.length,
      deletedUsers: deleted.length,
      drivers: drivers.length,
      verifiedDrivers: drivers.filter(u => u.verificationStatus === 'verified').length,
      pendingVerifications: drivers.filter(u => u.verificationStatus === 'pending').length,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Auth login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await DeliveryPartner.findOne({ email, status: { $ne: 'deleted' } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials or account deleted' });
    if (password !== user.password) return res.status(401).json({ error: 'Invalid credentials' });
    const obj = user.toObject();
    delete obj.password;
    res.json({ message: 'Login successful', user: obj });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Auth register
app.post('/register', async (req, res) => {
  const { email } = req.body;
  try {
    const existing = await DeliveryPartner.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const maxUser = await DeliveryPartner.findOne().sort({ id: -1 });
    const newId = maxUser ? maxUser.id + 1 : 1;

    const newUser = new DeliveryPartner({
      id: newId,
      ...req.body,
      role: 'delivery-partner',
      status: 'active',
      verificationStatus: 'none',
      verificationDocs: [],
      isOnline: false,
      availableEarnings: 0,
      ratings: [],
      reports: [],
      warnings: [],
      reportCount: 0,
      vehicleType: '',
      vehicleNumber: '',
      withdrawals: [],
      notifications: []
    });
    await newUser.save();
    const obj = newUser.toObject();
    delete obj.password;
    res.status(201).json({ message: 'User registered', user: obj });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// User by ID
app.get('/:id', async (req, res) => {
  try {
    const user = await DeliveryPartner.findOne({ id: Number(req.params.id) });
    if (user) {
      await syncUserEarnings(user);
      return res.json(user);
    }
    res.status(404).json({ error: 'User not found' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle online/offline
app.put('/:id/online-status', async (req, res) => {
  try {
    const user = await DeliveryPartner.findOne({ id: Number(req.params.id) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.isOnline = req.body.isOnline;
    await user.save();
    res.json({ message: 'Status updated', user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update vehicle details
app.put('/:id/vehicle', async (req, res) => {
  try {
    const user = await DeliveryPartner.findOne({ id: Number(req.params.id) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.vehicleType = req.body.vehicleType || user.vehicleType;
    user.vehicleNumber = req.body.vehicleNumber || user.vehicleNumber;
    await user.save();
    res.json({ message: 'Vehicle updated', user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user (admin)
app.delete('/:id', async (req, res) => {
  try {
    const user = await DeliveryPartner.findOne({ id: Number(req.params.id) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.status = 'deleted';
    if (user.reports && user.reports.length > 0) {
      user.reports.forEach(r => {
        if (!r.actionTaken) {
          r.actionTaken = 'restricted';
        }
      });
      user.markModified('reports');
    }
    await user.save();
    res.json({ message: 'User account deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Restore user
app.put('/:id/restore', async (req, res) => {
  try {
    const user = await DeliveryPartner.findOne({ id: Number(req.params.id) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.status = 'active';
    user.reportCount = 0;
    await user.save();
    res.json({ message: 'User account restored', user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Report count increment
app.put('/:id/report', async (req, res) => {
  try {
    const user = await DeliveryPartner.findOne({ id: Number(req.params.id) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.reportCount = (user.reportCount || 0) + 1;
    await user.save();
    res.json({ message: 'Report count updated', user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add earnings
app.post('/:id/add-earnings', async (req, res) => {
  const { amount } = req.body;
  try {
    const user = await DeliveryPartner.findOne({ id: Number(req.params.id) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.availableEarnings = (user.availableEarnings || 0) + Number(amount);
    await user.save();
    res.json({ message: 'Earnings added', user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Withdraw earnings
app.post('/:id/withdraw', async (req, res) => {
  const { amount, method, details } = req.body;
  try {
    const user = await DeliveryPartner.findOne({ id: Number(req.params.id) });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const withdrawAmount = Number(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount' });
    }

    await syncUserEarnings(user);

    if (withdrawAmount > (user.availableEarnings || 0)) {
      return res.status(400).json({ error: 'Insufficient earnings' });
    }

    user.availableEarnings = (user.availableEarnings || 0) - withdrawAmount;

    // Record withdrawal
    if (!user.withdrawals) user.withdrawals = [];
    const withdrawalRecord = {
      id: 'WTH' + Math.floor(100000 + Math.random() * 900000),
      amount: withdrawAmount,
      method: method || 'bank',
      details: details || {},
      timestamp: new Date().toISOString(),
      status: 'completed'
    };
    user.withdrawals.push(withdrawalRecord);
    user.markModified('withdrawals');

    await user.save();
    res.json({ 
      message: 'Withdrawal successful', 
      withdrawal: withdrawalRecord,
      user: {
        id: user.id,
        availableEarnings: user.availableEarnings,
        withdrawals: user.withdrawals,
        notifications: user.notifications
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get withdrawal history for a user
app.get('/:id/withdrawals', async (req, res) => {
  try {
    const user = await DeliveryPartner.findOne({ id: Number(req.params.id) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.withdrawals || []);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get notifications for a user
app.get('/:id/notifications', async (req, res) => {
  try {
    const user = await DeliveryPartner.findOne({ id: Number(req.params.id) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.notifications || []);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark all notifications as read
app.post('/:id/notifications/mark-read', async (req, res) => {
  try {
    const user = await DeliveryPartner.findOne({ id: Number(req.params.id) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.notifications) {
      user.notifications.forEach(n => n.read = true);
      user.markModified('notifications');
    }
    await user.save();
    res.json({ message: 'Notifications marked as read', notifications: user.notifications || [] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit verification documents
app.post('/verify', async (req, res) => {
  const { userId, documents } = req.body;
  try {
    const user = await DeliveryPartner.findOne({ id: Number(userId) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.verificationStatus = 'pending';
    user.verificationDocs = documents || [];
    user.markModified('verificationDocs');
    await user.save();
    res.json({ message: 'Verification requested', user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify status update (driver-facing)
app.put('/:id/verify', async (req, res) => {
  const { verificationStatus } = req.body;
  try {
    const user = await DeliveryPartner.findOne({ id: Number(req.params.id) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.verificationStatus = verificationStatus;
    await user.save();
    res.json({ message: `User verification ${verificationStatus}`, user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Send formal warning to rider
app.post('/warn-rider', async (req, res) => {
  const { targetUserId, reason, adminName, orderId } = req.body;
  try {
    const user = await DeliveryPartner.findOne({ id: Number(targetUserId) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (!user.warnings) user.warnings = [];
    const warning = {
      id: Date.now(),
      reason: reason || 'Violation of platform terms.',
      adminName: adminName || 'System Admin',
      timestamp: new Date().toISOString(),
      isActive: true
    };
    user.warnings.push(warning);
    user.markModified('warnings');

    // Mark the corresponding report as acted upon/resolved
    if (user.reports && user.reports.length > 0) {
      const report = user.reports.find(r => String(r.orderId) === String(orderId));
      if (report) {
        report.actionTaken = 'warning';
        user.markModified('reports');
      }
    }

    await user.save();
    res.json({ message: 'Warning issued', warning });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Clear all warnings for a user
app.post('/:id/clear-warnings', async (req, res) => {
  try {
    const user = await DeliveryPartner.findOne({ id: Number(req.params.id) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.warnings = [];
    user.markModified('warnings');
    await user.save();
    res.json({ message: 'All warnings cleared' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Feedback/rating submission
app.post(/.*feedback$/, async (req, res) => {
  const { rating, feedback, isIssue, fromId, fromName, orderId, driverId } = req.body;
  const pathSegments = req.url.split('/');
  const idFromPath = pathSegments.find(s => s && !isNaN(s));
  const targetId = idFromPath || driverId;
  if (!targetId) return res.status(400).json({ error: 'User ID required' });
  
  try {
    const user = await DeliveryPartner.findOne({ id: Number(targetId) });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const record = {
      rating: Number(rating) || 5,
      feedback: feedback || '',
      fromId, fromName: fromName || 'Anonymous',
      orderId,
      timestamp: new Date().toISOString()
    };
    
    if (isIssue) {
      if (!user.reports) user.reports = [];
      user.reports.push(record);
      user.reportCount = (user.reportCount || 0) + 1;
      user.markModified('reports');
    } else {
      if (!user.ratings) user.ratings = [];
      user.ratings.push(record);
      user.markModified('ratings');
    }
    
    await user.save();
    res.json({ message: 'Feedback submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Catch-all
app.use((req, res) => {
  console.log(`[DELIVERY-USER-SERVICE-404] ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => console.log(`[DELIVERY-USER-SERVICE] Listening on port ${PORT}`));
