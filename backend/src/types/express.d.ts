import { User as DatabaseUser } from './database';

declare global {
  namespace Express {
    interface User extends DatabaseUser {}
    
    interface Request {
      user?: DatabaseUser;
    }
  }
}

