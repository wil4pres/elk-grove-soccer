'use client'

import dynamic from 'next/dynamic'

const UploadsClient = dynamic(() => import('./uploads-client'), { ssr: false })

export default function UploadsPage() {
  return <UploadsClient />
}
