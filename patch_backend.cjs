const fs = require('fs');
const f = 'c:/Users/ADMIN/OneDrive/Desktop/ibm/app/user-service/server.js';
let s = fs.readFileSync(f, 'utf8');

// 1. Add new fields to registration - use regex for cross-platform newlines
s = s.replace(
  /verificationDocs: \[\]\s*\};/,
  `verificationDocs: [],
    verificationAttempts: 0,
    isOnline: false,
    vehicleType: "",
    vehicleNumber: ""
  };`
);

// 2. Add new endpoints before login
const newEndpoints = `
// Toggle online/offline status
app.put('/:id/online-status', (req, res) => {
  const user = users.find(u => String(u.id) === String(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.isOnline = req.body.isOnline;
  saveUsers();
  res.json({ message: 'Status updated', user });
});

// Update vehicle details
app.put('/:id/vehicle', (req, res) => {
  const user = users.find(u => String(u.id) === String(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.vehicleType = req.body.vehicleType || user.vehicleType;
  user.vehicleNumber = req.body.vehicleNumber || user.vehicleNumber;
  saveUsers();
  res.json({ message: 'Vehicle updated', user });
});

`;

if (!s.includes("/:id/online-status")) {
  s = s.replace("app.post('/login',", newEndpoints + "app.post('/login',");
}

fs.writeFileSync(f, s);
console.log('Backend updated successfully');
