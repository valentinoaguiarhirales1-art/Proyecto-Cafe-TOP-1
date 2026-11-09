const mongoose = require('mongoose');

const staffApplicationSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    phone: { type: String, default: '', trim: true, maxlength: 30 },
    requestedPosition: { type: String, required: true, enum: ['barista', 'atencion', 'encargado'] },
    experienceYears: { type: Number, required: true, min: 0, max: 60 },
    isRecentGraduate: { type: Boolean, default: false },
    publicProfileConsent: { type: Boolean, default: false },
    profileBio: { type: String, default: '', trim: true, maxlength: 240 },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'accepted'],
        default: 'pending'
    },
    invitationHash: { type: String, default: '' },
    invitationExpiresAt: { type: Date, default: null },
    acceptedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

staffApplicationSchema.index({ email: 1, status: 1 });

module.exports = mongoose.model('StaffApplication', staffApplicationSchema);
