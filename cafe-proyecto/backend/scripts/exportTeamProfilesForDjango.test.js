const test = require('node:test');
const assert = require('node:assert/strict');
const { toExportItem } = require('./exportTeamProfilesForDjango');

test('exporta únicamente datos del perfil, sin información laboral privada', () => {
    const result = toExportItem({
        _id: '507f1f77bcf86cd799439011', name: 'Persona ficticia', role: 'barista',
        email: 'privado', password: 'privado',
        employeeData: {
            experienceYears: 2, isRecentGraduate: false, profileBio: 'Hola',
            publicProfileConsent: true, publicProfile: true,
            curp: 'privado', salary: 'privado', branchAssigned: 'privado'
        }
    });
    assert.deepEqual(result, {
        _id: '507f1f77bcf86cd799439011', name: 'Persona ficticia', role: 'barista',
        experienceYears: 2, isRecentGraduate: false, profileBio: 'Hola',
        publicProfileConsent: true, publicProfile: true
    });
    assert.equal(JSON.stringify(result).includes('privado'), false);
});
