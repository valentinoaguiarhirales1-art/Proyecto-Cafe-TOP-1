const test = require('node:test');
const assert = require('node:assert/strict');
const { toExportItem } = require('./exportStaffApplicationsForDjango');

test('la exportación excluye invitaciones y cuentas vinculadas', () => {
    const result = toExportItem({
        _id: '507f1f77bcf86cd799439011',
        name: 'Persona ficticia',
        email: 'prueba@example.com',
        phone: '',
        requestedPosition: 'barista',
        experienceYears: 2,
        isRecentGraduate: false,
        publicProfileConsent: true,
        profileBio: '',
        status: 'pending',
        createdAt: '2026-01-20T20:00:00.000Z',
        invitationHash: 'no-exportar',
        invitationExpiresAt: '2026-01-27T20:00:00.000Z',
        acceptedUser: 'no-exportar',
        otroDatoPrivado: 'no-exportar'
    });
    assert.deepEqual(Object.keys(result), [
        '_id', 'name', 'email', 'phone', 'requestedPosition', 'experienceYears',
        'isRecentGraduate', 'publicProfileConsent', 'profileBio', 'status', 'createdAt'
    ]);
    assert.equal(JSON.stringify(result).includes('no-exportar'), false);
});
