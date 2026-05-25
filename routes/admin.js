const express = require('express');
const router = express.Router();
const db = require('../config/db');

// middleware xac thuc admin
function isAdmin(req, res, next) {
    if (req.session && req.session.user && Number(req.session.user.ROLE_ID || req.session.user.role_id) === 1) {
        return next();
    }
    res.redirect('/login');
}
router.use(isAdmin);

//thong ke doanh thu
router.get('/dashboard', async (req, res) => {
    try {
        const [today] = await db.query("SELECT IFNULL(SUM(TONG_TIEN), 0) AS total FROM DON_HANG WHERE DATE(CREATED_AT) = CURDATE() AND TRANG_THAI = 'Hoàn thành'");
        const [month] = await db.query("SELECT IFNULL(SUM(TONG_TIEN), 0) AS total FROM DON_HANG WHERE MONTH(CREATED_AT) = MONTH(CURDATE()) AND YEAR(CREATED_AT) = YEAR(CURDATE()) AND TRANG_THAI = 'Hoàn thành'");
        res.render('admin/dashboard', { 
            user: req.session.user,
            todayRevenue: today[0].total,
            monthRevenue: month[0].total
        });
    } catch (err) { res.status(500).send("Lỗi: " + err.message); }
});

//qly san pham

// product
router.get('/products', async (req, res) => {
    try {

        const [products] = await db.query(
            "SELECT * FROM SAN_PHAM ORDER BY ID ASC"
        );

        res.render('admin/products', {
            user: req.session.user,
            products
        });

    } catch (err) {

        res.status(500).send(err.message);

    }
});

// them
router.post('/products/add', async (req, res) => {

    try {

        const {
            product_name,
            price,
            image,
            category_id,
            stock,
            description,
            brand
        } = req.body;

        await db.query(
            `
            INSERT INTO SAN_PHAM
            (
                PRODUCT_NAME,
                PRICE,
                IMAGE,
                CATEGORY_ID,
                STOCK,
                DESCRIPTION,
                BRAND
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                product_name,
                price,
                image,
                category_id,
                stock,
                description,
                brand
            ]
        );

        res.redirect('/admin/products');

    } catch (err) {

        console.error(err);

        res.status(500).send(err.message);

    }

});

// sua
router.post('/products/edit/:id', async (req, res) => {

    try {

        const {
            product_name,
            price,
            image,
            category_id,
            stock,
            description,
            brand
        } = req.body;

        await db.query(
            `
            UPDATE SAN_PHAM
            SET
                PRODUCT_NAME = ?,
                PRICE = ?,
                IMAGE = ?,
                CATEGORY_ID = ?,
                STOCK = ?,
                DESCRIPTION = ?,
                BRAND = ?
            WHERE ID = ?
            `,
            [
                product_name,
                price,
                image,
                category_id,
                stock,
                description,
                brand,
                req.params.id
            ]
        );

        res.redirect('/admin/products');

    } catch (err) {

        console.error(err);

        res.status(500).send(err.message);

    }

});

// xoa
router.post('/products/delete/:id', async (req, res) => {

    try {

        await db.query(
            "DELETE FROM SAN_PHAM WHERE ID = ?",
            [req.params.id]
        );

        res.redirect('/admin/products');

    } catch (err) {

        res.status(500).send(err.message);

    }

});
// router them
router.post('/products/add', async (req, res) => {
    try {
        // Thêm category vào đây
        const { product_name, price, image, category } = req.body;
        await db.query("INSERT INTO SAN_PHAM (PRODUCT_NAME, PRICE, IMAGE, CATEGORY) VALUES (?, ?, ?, ?)", 
        [product_name, price, image, category]);
        res.redirect('/admin/products');
    } catch (err) { res.status(500).send(err.message); }
});

// router sua
router.post('/products/edit/:id', async (req, res) => {
    try {
        const { product_name, price, image, category } = req.body;
        await db.query("UPDATE SAN_PHAM SET PRODUCT_NAME = ?, PRICE = ?, IMAGE = ?, CATEGORY = ? WHERE ID = ?", 
        [product_name, price, image, category, req.params.id]);
        res.redirect('/admin/products');
    } catch (err) { res.status(500).send(err.message); }
});
//qly tai khoan
router.get('/users', async (req, res) => {
    try {
        const [users] = await db.query("SELECT * FROM NGUOI_SU_DUNG ORDER BY ID DESC");
        res.render('admin/users', { user: req.session.user, users });
    } catch (err) { res.status(500).send(err.message); }
});

router.post('/users/delete/:id', async (req, res) => {
    try {
        // giup bao ve admin ko tu xoa tai khoan cua chinh minh
        const currentAdminId = req.session.user.ID || req.session.user.id;
        if (Number(req.params.id) === Number(currentAdminId)) {
            return res.status(400).send("Bạn không thể tự xóa tài khoản Admin của chính mình!");
        }
        await db.query("DELETE FROM NGUOI_SU_DUNG WHERE ID = ?", [req.params.id]);
        res.redirect('/admin/users');
    } catch (err) { res.status(500).send(err.message); }
});

//qly don hang
router.get('/orders', async (req, res) => {
    try {
        const [orders] = await db.query("SELECT * FROM DON_HANG ORDER BY CREATED_AT DESC");
        res.render('admin/orders', { user: req.session.user, orders });
    } catch (err) { res.status(500).send(err.message); }
});

router.post('/orders/update-status/:id', async (req, res) => {
    try {
        await db.query("UPDATE DON_HANG SET TRANG_THAI = ? WHERE ID = ?", [req.body.status, req.params.id]);
        res.redirect('/admin/orders');
    } catch (err) { res.status(500).send(err.message); }
});

//qly bai viet
router.get('/posts', async (req, res) => {
    try {
        const [posts] = await db.query("SELECT * FROM BAI_VIET ORDER BY ID DESC");
        res.render('admin/posts', { user: req.session.user, posts });
    } catch (err) { res.status(500).send(err.message); }
});

router.post('/posts/add', async (req, res) => {
    try {
        const { title, summary } = req.body;
        await db.query("INSERT INTO BAI_VIET (TITLE, SUMMARY) VALUES (?, ?)", [title, summary]);
        res.redirect('/admin/posts');
    } catch (err) { res.status(500).send(err.message); }
});

router.post('/posts/edit/:id', async (req, res) => {
    try {
        const { title, summary } = req.body;
        await db.query("UPDATE BAI_VIET SET TITLE = ?, SUMMARY = ? WHERE ID = ?", [title, summary, req.params.id]);
        res.redirect('/admin/posts');
    } catch (err) { res.status(500).send(err.message); }
});

router.post('/posts/delete/:id', async (req, res) => {
    try {
        await db.query("DELETE FROM BAI_VIET WHERE ID = ?", [req.params.id]);
        res.redirect('/admin/posts');
    } catch (err) { res.status(500).send(err.message); }
});

module.exports = router;