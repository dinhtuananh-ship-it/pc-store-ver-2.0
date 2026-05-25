const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');

router.get('/login', (req, res) => { res.render('client/login', { error: null }); });
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await db.query("SELECT * FROM NGUOI_SU_DUNG WHERE EMAIL = ? OR PHONE = ?", [email, email]);
        if (users.length === 0) return res.render('client/login', { error: 'Tài khoản không tồn tại!' });

        const user = users[0];
        const userPassword = user.PASSWORD || user.password;
        let userRoleId = Number(user.ROLE_ID || user.role_id);
        let match = (password === userPassword);
        if (!match) { try { match = await bcrypt.compare(password, userPassword); } catch(e){} }
        if (!match) return res.render('client/login', { error: 'Sai mật khẩu!' });

        req.session.user = { id: user.ID || user.id, FULLNAME: user.FULLNAME, PHONE: user.PHONE, ADDRESS: user.ADDRESS, ROLE_ID: userRoleId };
        req.session.save(() => { res.redirect(userRoleId === 1 ? '/admin/dashboard' : '/'); });
    } catch (err) { res.status(500).send("Lỗi: " + err.message); }
});

router.get('/register', (req, res) => { res.render('client/register', { error: null }); });
router.post('/register', async (req, res) => {
    const { fullname, email, password, phone, address } = req.body;
    try {
        const [exist] = await db.query("SELECT * FROM NGUOI_SU_DUNG WHERE EMAIL = ?", [email]);
        if (exist.length > 0) return res.render('client/register', { error: 'Email đã tồn tại!' });
        const hashed = await bcrypt.hash(password, 10);
        await db.query(`INSERT INTO NGUOI_SU_DUNG (FULLNAME, EMAIL, PASSWORD, PHONE, ADDRESS, ROLE_ID) VALUES (?, ?, ?, ?, ?, 2)`, [fullname, email, hashed, phone, address]);
        res.redirect('/login');
    } catch (err) { res.status(500).send(err.message); }
});

// TÍNH NĂNG QUÊN MẬT KHẨU QUA SỐ ĐIỆN THOẠI
router.get('/forgot-password', (req, res) => {
    res.render('client/forgot-password', { error: null, success: null });
});
router.post('/forgot-password', async (req, res) => {
    const { phone, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
        return res.render('client/forgot-password', { error: 'Mật khẩu xác nhận không trùng khớp!', success: null });
    }
    try {
        // Kiểm tra xem số điện thoại có tồn tại trên hệ thống không
        const [users] = await db.query("SELECT * FROM NGUOI_SU_DUNG WHERE PHONE = ?", [phone]);
        if (users.length === 0) {
            return res.render('client/forgot-password', { error: 'Số điện thoại này chưa được đăng ký trong hệ thống!', success: null });
        }
        // Mã hóa mật khẩu mới và cập nhật vào DB
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await db.query("UPDATE NGUOI_SU_DUNG SET PASSWORD = ? WHERE PHONE = ?", [hashedNewPassword, phone]);
        res.render('client/forgot-password', { error: null, success: 'Cập nhật lại mật khẩu thành công! Bạn có thể quay lại đăng nhập.' });
    } catch (err) {
        res.status(500).send("Lỗi xử lý hệ thống: " + err.message);
    }
});

router.get('/', async (req, res) => {
    try {
        const { search, category } = req.query;
        let queryStr = "SELECT p.*, c.CATEGORY_NAME FROM SAN_PHAM p JOIN LOAI_HANG c ON p.CATEGORY_ID = c.ID WHERE 1=1";
        let params = [];
        if (search) { queryStr += " AND p.PRODUCT_NAME LIKE ?"; params.push(`%${search}%`); }
        if (category) { queryStr += " AND p.CATEGORY_ID = ?"; params.push(category); }
        
        const [products] = await db.query(queryStr, params);
        const [categories] = await db.query("SELECT * FROM LOAI_HANG");
        const [posts] = await db.query("SELECT * FROM BAI_VIET ORDER BY CREATED_AT DESC LIMIT 3");
        let cartCount = req.session.cart ? req.session.cart.reduce((t, i) => t + i.quantity, 0) : 0;
        
        res.render('client/index', { products, categories, posts, cartCount, user: req.session.user, search: search || '' });
    } catch (err) { res.status(500).send(err.message); }
});

router.get('/product/:id', async (req, res) => {
    try {
        const [products] = await db.query("SELECT * FROM SAN_PHAM WHERE ID = ?", [req.params.id]);
        if (products.length === 0) return res.status(404).send("Không có sản phẩm");
        res.render('client/product-detail', { product: products[0], user: req.session.user });
    } catch (err) { res.status(500).send(err.message); }
});

router.get('/post/:id', async (req, res) => {
    try {
        const [posts] = await db.query("SELECT * FROM BAI_VIET WHERE ID = ?", [req.params.id]);
        res.render('client/post-detail', { post: posts[0], user: req.session.user });
    } catch (err) { res.status(500).send(err.message); }
});

router.post('/cart/add', async (req, res) => {
    if (!req.session.cart) req.session.cart = [];
    try {
        const [products] = await db.query("SELECT * FROM SAN_PHAM WHERE ID = ?", [req.body.productId]);
        const p = products[0];
        const idx = req.session.cart.findIndex(i => i.id == p.ID);
        if (idx > -1) req.session.cart[idx].quantity += 1;
        else req.session.cart.push({ id: p.ID, name: p.PRODUCT_NAME, price: p.PRICE, image: p.IMAGE, quantity: 1 });
        res.redirect('/');
    } catch (err) { res.status(500).send(err.message); }
});

router.get('/cart', (req, res) => {
    const cart = req.session.cart || [];
    const totalAmount = cart.reduce((t, i) => t + (i.price * i.quantity), 0);
    res.render('client/cart', { cart, totalAmount, user: req.session.user });
});

// TÍNH NĂNG ĐIỀU CHỈNH SỐ LƯỢNG TRONG GIỎ HÀNG
router.post('/cart/update/:id', (req, res) => {
    const { quantity } = req.body;
    const newQty = parseInt(quantity);
    if (req.session.cart && newQty > 0) {
        const idx = req.session.cart.findIndex(item => item.id == req.params.id);
        if (idx > -1) {
            req.session.cart[idx].quantity = newQty;
        }
    }
    res.redirect('/cart');
});

router.get('/cart/remove/:id', (req, res) => {
    if (req.session.cart) req.session.cart = req.session.cart.filter(i => i.id != req.params.id);
    res.redirect('/cart');
});

router.post('/cart/checkout', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const cart = req.session.cart || [];
    if (cart.length === 0) return res.redirect('/cart');
    
    const { hoten, sdt, diachi, discountCode } = req.body;
    let totalAmount = cart.reduce((t, i) => t + (i.price * i.quantity), 0);

    if (discountCode && discountCode.toUpperCase() === 'ABC') {
        totalAmount = totalAmount - (totalAmount * 0.10);
    }

    try {
        await db.query(
            `INSERT INTO DON_HANG (USER_ID, HOTEN_NGUOI_NHAN, SDT_NGUOI_NHAN, DIA_CHI_NHAN, TONG_TIEN, TRANG_THAI) VALUES (?, ?, ?, ?, ?, 'Chờ xác nhận')`, 
            [req.session.user.id, hoten, sdt, diachi, totalAmount]
        );
        req.session.cart = [];
        res.redirect('/orders/history');
    } catch (err) { res.status(500).send("Lỗi đặt hàng: " + err.message); }
});

router.get('/orders/history', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    try {
        const [orders] = await db.query("SELECT * FROM DON_HANG WHERE USER_ID = ? ORDER BY CREATED_AT DESC", [req.session.user.id]);
        res.render('client/orders', { orders, user: req.session.user });
    } catch (err) { res.status(500).send(err.message); }
});

router.get('/logout', (req, res) => { req.session.destroy(() => res.redirect('/login')); });

module.exports = router;