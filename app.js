const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

// Cấu hình Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'computer_store_secret_key',
    resave: false,
    saveUninitialized: true
}));

// Cấu hình View Engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Truyền thông tin Session vào tất cả các View EJS mẫu
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.cart = req.session.cart || [];
    next();
});

// Định tuyến (Routing)
const clientRoutes = require('./routes/client');
const adminRoutes = require('./routes/admin');

app.use('/', clientRoutes);
app.use('/admin', adminRoutes);

// Khởi chạy Server
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server đang chạy tại: http://localhost:${PORT}`);
});