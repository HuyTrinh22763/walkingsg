module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { isolatedModules: true, tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },
  moduleNameMapper: {
    '^react-native$': '<rootDir>/stubs/react-native.js',
    '^expo-location$': '<rootDir>/stubs/expo-location.js',
  },
};
