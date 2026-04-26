import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Student, Admin } from '../lib/types';
import { getAdmins, getStudents } from '../lib/storage';
import type { UserRole } from '../lib/types';

interface AuthContextType {
  user: Student | Admin | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  login: (identifier: string, password: string, role: UserRole) => Promise<boolean>;
  signup: (name: string, mobile: string, password: string, batch: string, seatId?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Student | Admin | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const savedUser = await AsyncStorage.getItem('@library_current_user');
      const savedRole = await AsyncStorage.getItem('@library_current_role');
      
      if (savedUser && savedRole) {
        setUser(JSON.parse(savedUser));
        setRole(savedRole as UserRole);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (identifier: string, password: string, loginRole: UserRole): Promise<boolean> => {
    try {
      if (loginRole === 'admin') {
        const admins = await getAdmins();
        const admin = admins.find(
          (a) => (a.email === identifier || a.name.toLowerCase() === identifier.toLowerCase()) && a.password === password
        );
        if (admin) {
          setUser(admin);
          setRole('admin');
          await AsyncStorage.setItem('@library_current_user', JSON.stringify(admin));
          await AsyncStorage.setItem('@library_current_role', 'admin');
          return true;
        }
      } else {
        const students = await getStudents();
        const student = students.find(
          (s) => s.mobile === identifier && s.password === password && s.isActive
        );
        if (student) {
          setUser(student);
          setRole('student');
          await AsyncStorage.setItem('@library_current_user', JSON.stringify(student));
          await AsyncStorage.setItem('@library_current_role', 'student');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const signup = async (
    name: string,
    mobile: string,
    password: string,
    batch: string,
    seatId?: string
  ): Promise<boolean> => {
    try {
      const students = await getStudents();
      
      // Check if mobile already exists
      if (students.some((s) => s.mobile === mobile)) {
        return false;
      }
      
      const newStudent: Student = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        mobile,
        password,
        seatId,
        batch: batch as Student['batch'],
        joinedDate: new Date().toISOString(),
        totalStudyHours: 0,
        acceptedRules: false,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      
      students.push(newStudent);
      const { saveStudents } = require('../lib/storage');
      await saveStudents(students);
      
      setUser(newStudent);
      setRole('student');
      await AsyncStorage.setItem('@library_current_user', JSON.stringify(newStudent));
      await AsyncStorage.setItem('@library_current_role', 'student');
      
      return true;
    } catch (error) {
      console.error('Signup error:', error);
      return false;
    }
  };

  const logout = async () => {
    setUser(null);
    setRole(null);
    try {
      await AsyncStorage.removeItem('@library_current_user');
      await AsyncStorage.removeItem('@library_current_role');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, isAuthenticated: !!user, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
