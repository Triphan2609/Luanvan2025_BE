import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getApiInfo() {
    return {
      name: 'Hotel & Restaurant Management API',
      version: '1.0.0',
      description: 'Backend API for Hotel and Restaurant Management System',
      status: 'Active',
      environment: process.env.NODE_ENV || 'development',
      documentation: '/api-docs',
      endpoints: {
        base: '/api',
        docs: '/api-docs',
        health: '/api/health',
      },
      features: [
        'User Authentication & Authorization',
        'Hotel Management',
        'Restaurant Management',
        'Employee Management',
        'Customer Management',
        'Booking & Reservations',
      ],
    };
  }

  getHealth() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: `${process.uptime().toFixed(0)} seconds`,
    };
  }
}
