const { validateEnv } = require('../server');

describe('server environment validation (validateEnv)', () => {
  const originalEnv = { ...process.env };
  let exitMock;
  let errorMock;

  beforeEach(() => {
    process.env = { ...originalEnv };
    exitMock = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit called with ${code}`);
    });
    errorMock = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    exitMock.mockRestore();
    errorMock.mockRestore();
  });

  it('exits with code 1 if MONGO_URI is missing', () => {
    delete process.env.MONGO_URI;
    process.env.JWT_SECRET = 'a'.repeat(32);

    expect(() => validateEnv()).toThrow('process.exit called with 1');
    expect(errorMock).toHaveBeenCalledWith(
      expect.stringContaining('MONGO_URI')
    );
  });

  it('exits with code 1 if JWT_SECRET is missing', () => {
    process.env.MONGO_URI = 'mongodb://localhost:27017/test';
    delete process.env.JWT_SECRET;

    expect(() => validateEnv()).toThrow('process.exit called with 1');
    expect(errorMock).toHaveBeenCalledWith(
      expect.stringContaining('JWT_SECRET')
    );
  });

  it('exits with code 1 if NODE_ENV is production and JWT_SECRET is shorter than 32 characters', () => {
    process.env.MONGO_URI = 'mongodb://localhost:27017/test';
    process.env.JWT_SECRET = 'short-secret';
    process.env.NODE_ENV = 'production';

    expect(() => validateEnv()).toThrow('process.exit called with 1');
    expect(errorMock).toHaveBeenCalledWith(
      expect.stringContaining('JWT_SECRET must be at least 32 characters')
    );
  });

  it('does not exit if NODE_ENV is development and JWT_SECRET is short', () => {
    process.env.MONGO_URI = 'mongodb://localhost:27017/test';
    process.env.JWT_SECRET = 'short-secret';
    process.env.NODE_ENV = 'development';

    expect(() => validateEnv()).not.toThrow();
    expect(exitMock).not.toHaveBeenCalled();
  });

  it('does not exit if NODE_ENV is production and JWT_SECRET is 32 or more characters', () => {
    process.env.MONGO_URI = 'mongodb://localhost:27017/test';
    process.env.JWT_SECRET = 'a'.repeat(32);
    process.env.NODE_ENV = 'production';

    expect(() => validateEnv()).not.toThrow();
    expect(exitMock).not.toHaveBeenCalled();
  });
});
