// controllers/joinRequest.controller.js

const JoinRequest = require("../models/JoinRequest");
const Club = require("../models/Club");

/**
 * =====================================================
 * POST /clubs/:clubId/join
 * Usuario envía solicitud para unirse a un club
 * =====================================================
 */
const createJoinRequest = async (req, res) => {
  try {
    const { clubId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "No autenticado" });
    }

    // 1️⃣ Verificar que el club exista
    const club = await Club.findById(clubId);
    if (!club) {
      return res.status(404).json({ message: "Club no encontrado" });
    }

    // 2️⃣ Verificar que NO pertenezca ya a un club
    const alreadyMember = await Club.findOne({
      "members.user": userId
    });

    if (alreadyMember) {
      return res.status(400).json({
        message: "Ya perteneces a un club"
      });
    }

    // 3️⃣ Verificar que no tenga solicitud pendiente
    const existingRequest = await JoinRequest.findOne({
      user: userId,
      status: "pending"
    });

    if (existingRequest) {
      return res.status(400).json({
        message: "Ya tienes una solicitud pendiente"
      });
    }

    // 4️⃣ Crear solicitud
    const request = await JoinRequest.create({
      user: userId,
      club: clubId
    });

    return res.status(201).json({
      message: "Solicitud enviada correctamente",
      request
    });

  } catch (error) {
    console.error("createJoinRequest ERROR:", error);
    return res.status(500).json({
      message: "Error al enviar solicitud"
    });
  }
};

/**
 * =====================================================
 * GET /clubs/:clubId/requests
 * Admin ve solicitudes pendientes
 * =====================================================
 */
const getPendingRequests = async (req, res) => {
  try {
    const { clubId } = req.params;

    const requests = await JoinRequest.find({
      club: clubId,
      status: "pending"
    }).populate("user", "username gamerTag email");

    return res.status(200).json(requests);

  } catch (error) {
    console.error("getPendingRequests ERROR:", error);
    return res.status(500).json({
      message: "Error al obtener solicitudes"
    });
  }
};

/**
 * =====================================================
 * PUT /clubs/:clubId/requests/:requestId/approve
 * Admin aprueba solicitud
 * =====================================================
 */
const approveRequest = async (req, res) => {
  try {
    const { clubId, requestId } = req.params;

    const request = await JoinRequest.findById(requestId);

    if (!request || request.status !== "pending") {
      return res.status(404).json({
        message: "Solicitud no válida"
      });
    }

    // Agregar usuario al club como member
    await Club.findByIdAndUpdate(clubId, {
      $push: {
        members: {
          user: request.user,
          role: "member"
        }
      }
    });

    request.status = "approved";
    await request.save();

    return res.status(200).json({
      message: "Solicitud aprobada"
    });

  } catch (error) {
    console.error("approveRequest ERROR:", error);
    return res.status(500).json({
      message: "Error al aprobar solicitud"
    });
  }
};

/**
 * =====================================================
 * PUT /clubs/:clubId/requests/:requestId/reject
 * Admin rechaza solicitud
 * =====================================================
 */
const rejectRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await JoinRequest.findById(requestId);

    if (!request || request.status !== "pending") {
      return res.status(404).json({
        message: "Solicitud no válida"
      });
    }

    request.status = "rejected";
    await request.save();

    return res.status(200).json({
      message: "Solicitud rechazada"
    });

  } catch (error) {
    console.error("rejectRequest ERROR:", error);
    return res.status(500).json({
      message: "Error al rechazar solicitud"
    });
  }
};

module.exports = {
  createJoinRequest,
  getPendingRequests,
  approveRequest,
  rejectRequest
};
