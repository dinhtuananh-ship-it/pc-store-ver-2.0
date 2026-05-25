const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();

// cau hinh middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'computer_store_secret_key',
    resave: false,
    saveUninitialized: true
}));

// cau hinh view engine (ejs)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// truyen thong tin session vao tat ca view ejs mau
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.cart = req.session.cart || [];
    next();
});

// routing
const clientRoutes = require('./routes/client');
const adminRoutes = require('./routes/admin');

app.use('/', clientRoutes);
app.use('/admin', adminRoutes);

// chay server
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server đang chạy tại: http://localhost:${PORT}`);
});