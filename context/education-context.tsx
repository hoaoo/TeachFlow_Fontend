'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import {
  type EducationProfile,
  type EducationCapabilities,
  type EducationTerminology,
  getCurrentEducationProfile,
  setEducationProfile as setStoredProfile,
  getCapabilities,
  getTerminology,
} from '@/lib/capabilities'

interface EducationContextType {
  profile: EducationProfile
  capabilities: EducationCapabilities
  labels: EducationTerminology
  setProfile: (profile: EducationProfile) => void
  refresh: () => void
}

const EducationContext = createContext<EducationContextType | undefined>(undefined)

export function EducationProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<EducationProfile>(() => getCurrentEducationProfile())

  const refresh = useCallback(() => {
    setProfileState(getCurrentEducationProfile())
  }, [])

  const setProfile = useCallback((newProfile: EducationProfile) => {
    setStoredProfile(newProfile)
    setProfileState(newProfile)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('teachflow:classes-changed'))
    }
  }, [])

  useEffect(() => {
    const handleProfileChanged = (e: Event) => {
      const customEvent = e as CustomEvent<EducationProfile>
      if (customEvent.detail) {
        setProfileState(customEvent.detail)
      } else {
        setProfileState(getCurrentEducationProfile())
      }
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'teachflow_education_profile') {
        setProfileState(getCurrentEducationProfile())
      }
    }

    window.addEventListener('teachflow:education-profile-changed', handleProfileChanged)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('teachflow:education-profile-changed', handleProfileChanged)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  const capabilities = useMemo(() => getCapabilities(profile), [profile])
  const labels = useMemo(() => getTerminology(profile), [profile])

  const value = useMemo(
    () => ({
      profile,
      capabilities,
      labels,
      setProfile,
      refresh,
    }),
    [profile, capabilities, labels, setProfile, refresh]
  )

  return <EducationContext.Provider value={value}>{children}</EducationContext.Provider>
}

export function useEducation(): EducationContextType {
  const context = useContext(EducationContext)
  if (!context) {
    const p = getCurrentEducationProfile()
    return {
      profile: p,
      capabilities: getCapabilities(p),
      labels: getTerminology(p),
      setProfile: setStoredProfile,
      refresh: () => {},
    }
  }
  return context
}
