'use client';

import React, { createContext, useContext, useCallback, useState } from 'react';
import {
  ClinicalEvent,
  AccessPermission,
  EventType,
} from '@/lib/types';
import * as blockchainSimulator from '@/lib/utils/blockchain-simulator';

interface BlockchainContextType {
  // Events
  getPatientEvents: (patientId: string) => ClinicalEvent[];
  getAccessibleEvents: (
    patientId: string,
    healthCenterId: string
  ) => ClinicalEvent[];
  createEvent: (
    patientId: string,
    healthCenterId: string,
    healthCenterName: string,
    eventType: EventType,
    date: string,
    description: string,
    createdBy: string,
    details?: Record<string, any>
  ) => Promise<ClinicalEvent>;

  // Permissions
  grantAccess: (
    patientId: string,
    healthCenterId: string,
    healthCenterName: string,
    permission?: 'view' | 'add',
    expiresAt?: Date
  ) => AccessPermission;
  revokeAccess: (permissionId: string) => void;
  getPatientPermissions: (patientId: string) => AccessPermission[];
  getHealthCenterAccess: (healthCenterId: string) => AccessPermission[];

  // Search
  searchPatientByDocument: (document: string) => string | null;

  // Blockchain state
  refreshData: () => void;
}

const BlockchainContext = createContext<BlockchainContextType | undefined>(
  undefined
);

export function BlockchainProvider({ children }: { children: React.ReactNode }) {
  const [, setRefresh] = useState(0);

  const refreshData = useCallback(() => {
    setRefresh((prev) => prev + 1);
  }, []);

  const getPatientEvents = useCallback((patientId: string) => {
    return blockchainSimulator.getPatientEvents(patientId);
  }, []);

  const getAccessibleEvents = useCallback(
    (patientId: string, healthCenterId: string) => {
      return blockchainSimulator.getAccessibleEvents(patientId, healthCenterId);
    },
    []
  );

  const createEvent = useCallback(
    async (
      patientId: string,
      healthCenterId: string,
      healthCenterName: string,
      eventType: EventType,
      date: string,
      description: string,
      createdBy: string,
      details?: Record<string, any>
    ) => {
      const event = await blockchainSimulator.createEvent(
        patientId,
        healthCenterId,
        healthCenterName,
        eventType,
        date,
        description,
        createdBy,
        details
      );
      refreshData();
      return event;
    },
    [refreshData]
  );

  const grantAccess = useCallback(
    (
      patientId: string,
      healthCenterId: string,
      healthCenterName: string,
      permission: 'view' | 'add' = 'view',
      expiresAt?: Date
    ) => {
      const permission_obj = blockchainSimulator.grantAccess(
        patientId,
        healthCenterId,
        healthCenterName,
        permission,
        expiresAt
      );
      refreshData();
      return permission_obj;
    },
    [refreshData]
  );

  const revokeAccess = useCallback(
    (permissionId: string) => {
      blockchainSimulator.revokeAccess(permissionId);
      refreshData();
    },
    [refreshData]
  );

  const getPatientPermissions = useCallback((patientId: string) => {
    return blockchainSimulator.getPatientPermissions(patientId);
  }, []);

  const getHealthCenterAccess = useCallback((healthCenterId: string) => {
    return blockchainSimulator.getHealthCenterAccess(healthCenterId);
  }, []);

  const searchPatientByDocument = useCallback((document: string) => {
    return blockchainSimulator.searchPatientByDocument(document);
  }, []);

  return (
    <BlockchainContext.Provider
      value={{
        getPatientEvents,
        getAccessibleEvents,
        createEvent,
        grantAccess,
        revokeAccess,
        getPatientPermissions,
        getHealthCenterAccess,
        searchPatientByDocument,
        refreshData,
      }}
    >
      {children}
    </BlockchainContext.Provider>
  );
}

export function useBlockchain() {
  const context = useContext(BlockchainContext);
  if (!context) {
    throw new Error('useBlockchain must be used within BlockchainProvider');
  }
  return context;
}
