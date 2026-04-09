// src/controllers/users.controller.js
const usersModel = require("../models/users");

const getAllUsers = async (req, res) => {
try {
    res.json(await usersModel.getAll());
} catch (err) {
    console.error("Error GET /users:", err);
    res.status(500).json({ error: err.message });
}
};

const getUserById = async (req, res) => {
try {
    const user = await usersModel.getById(req.params.id);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(user);
} catch (err) {
    console.error("Error GET /users/:id:", err);
    res.status(500).json({ error: err.message });
}
};

const getRoles = async (req, res) => {
try {
    res.json(await usersModel.getRoles());
} catch (err) {
    console.error("Error GET /users/roles:", err);
    res.status(500).json({ error: err.message });
}
};

const createUser = async (req, res) => {
try {
    const { firstName, lastName, email, role } = req.body;
    if (!firstName || !lastName || !email || !role)
    return res.status(400).json({ error: "Nombre, apellido, email y rol son requeridos" });

    const result = await usersModel.create(req.body);
    res.status(201).json(result);
} catch (err) {
    console.error("Error POST /users:", err);
    if (err.code === "P2002" || err.message?.includes("UNIQUE"))
    return res.status(400).json({ error: "El correo ya está registrado" });
    if (err.message?.includes("no encontrado"))
    return res.status(400).json({ error: err.message });
    res.status(500).json({ error: err.message });
}
};

const updateUser = async (req, res) => {
try {
    const result = await usersModel.update(req.params.id, req.body);
    res.json(result);
} catch (err) {
    console.error("Error PUT /users/:id:", err);
    res.status(500).json({ error: err.message });
}
};

const updateStatus = async (req, res) => {
try {
    const { isActive } = req.body;
    await usersModel.updateStatus(req.params.id, isActive);
    res.json({ ok: true });
} catch (err) {
    console.error("Error PATCH /users/:id/status:", err);
    res.status(500).json({ error: err.message });
}

};

const deleteUser = async (req, res) => {
try {
    await usersModel.remove(req.params.id);
    res.json({ ok: true });
} catch (err) {
    console.error("Error DELETE /users/:id:", err);
    res.status(500).json({ error: err.message });
}

};

module.exports = { getAllUsers, getUserById, getRoles, createUser, updateUser, updateStatus, deleteUser };