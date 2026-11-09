const Reservation = require('../models/Reservation');

exports.createReservation = async (req, res) => {
    try {
        const reservation = await Reservation.create({
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            date: new Date(`${req.body.date}T12:00:00Z`),
            time: req.body.time,
            partySize: Number(req.body.partySize),
            notes: req.body.notes || ''
        });

        res.status(201).json({
            message: 'Recibimos tu solicitud. El equipo confirmará la disponibilidad.',
            reservation
        });
    } catch (error) {
        res.status(400).json({ error: 'No se pudo registrar la reservación: ' + error.message });
    }
};

exports.getReservations = async (req, res) => {
    try {
        const reservations = await Reservation.find().sort({ date: 1, time: 1 });
        res.json(reservations);
    } catch (error) {
        res.status(500).json({ error: 'Error al consultar las reservaciones: ' + error.message });
    }
};

exports.updateReservationStatus = async (req, res) => {
    try {
        const reservation = await Reservation.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true, runValidators: true }
        );

        if (!reservation) {
            return res.status(404).json({ error: 'Reservación no encontrada' });
        }

        res.json(reservation);
    } catch (error) {
        res.status(400).json({ error: 'No se pudo actualizar la reservación: ' + error.message });
    }
};
