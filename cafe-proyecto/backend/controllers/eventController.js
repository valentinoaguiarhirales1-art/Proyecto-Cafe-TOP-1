const Event = require('../models/Event');

// @desc    Obtener cartelera de eventos y catas
// @route   GET /api/events
exports.getEvents = async (req, res) => {
    try {
        const events = await Event.find({ date: { $gte: new Date() } }).sort({ date: 1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los eventos: ' + error.message });
    }
};

// @desc    Crear un nuevo evento (Solo Dueño/Admin)
// @route   POST /api/events
exports.createEvent = async (req, res) => {
    try {
        const newEvent = await Event.create(req.body);
        res.status(201).json(newEvent);
    } catch (error) {
        res.status(400).json({ error: 'Error al crear evento: ' + error.message });
    }
};

// @desc    Reservar boleto para un evento (Cliente autenticado)
// @route   POST /api/events/:id/book
exports.bookEvent = async (req, res) => {
    const { seats } = req.body;
    const requestedSeats = Number(seats);

    try {
        const eventExists = await Event.exists({ _id: req.params.id });
        if (!eventExists) {
            return res.status(404).json({ error: 'Evento no encontrado' });
        }

        const event = await Event.findOneAndUpdate(
            {
                _id: req.params.id,
                $expr: {
                    $lte: [
                        { $add: [{ $sum: '$attendees.seats' }, requestedSeats] },
                        '$capacity'
                    ]
                }
            },
            {
                $push: {
                    attendees: {
                        user: req.user._id,
                        seats: requestedSeats
                    }
                }
            },
            { new: true, runValidators: true }
        );

        if (!event) {
            const currentEvent = await Event.findById(req.params.id);
            if (!currentEvent) {
                return res.status(404).json({ error: 'Evento no encontrado' });
            }
            const totalBooked = currentEvent.attendees.reduce((acc, attendee) => acc + attendee.seats, 0);
            return res.status(400).json({ 
                error: `Solo quedan ${Math.max(0, currentEvent.capacity - totalBooked)} lugares disponibles para este evento.` 
            });
        }

        res.status(200).json({ 
            message: `¡Reserva exitosa para "${event.title}"! Boletos apartados: ${requestedSeats}`,
            event 
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al reservar evento: ' + error.message });
    }
};


// @desc    Actualizar un evento (Solo Admin/Dueño)
// @route   PUT /api/events/:id
exports.updateEvent = async (req, res) => {
    try {
        const updateData = { ...req.body };
        if (req.file) updateData.imageUrl = req.file.path;
        const event = await Event.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
        if (!event) return res.status(404).json({ error: 'Evento no encontrado' });
        res.json(event);
    } catch (error) {
        res.status(400).json({ error: 'Error al actualizar evento: ' + error.message });
    }
};

// @desc    Eliminar un evento (Solo Admin/Dueño)
// @route   DELETE /api/events/:id
exports.deleteEvent = async (req, res) => {
    try {
        const event = await Event.findByIdAndDelete(req.params.id);
        if (!event) return res.status(404).json({ error: 'Evento no encontrado' });
        res.json({ message: 'Evento eliminado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar evento: ' + error.message });
    }
};
