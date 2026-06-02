import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App'

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30000, retry: 1 } } })

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryClientProvider client={qc}>
    <App />
    <Toaster position="top-right" toastOptions={{ style:{ fontFamily:'Inter', fontSize:13, borderRadius:10 } }}/>
  </QueryClientProvider>
)
