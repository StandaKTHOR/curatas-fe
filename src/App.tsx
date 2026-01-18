import { Routes, Route, Link, Navigate } from 'react-router-dom'
import Catalog from './pages/Catalog'
import Detail from './pages/Detail'
import Feedback from './pages/Feedback'
import Admin from './pages/Admin'
export default function App(){return (<div className='min-h-screen bg-gray-50'><div className='border-b bg-white'><div className='mx-auto max-w-6xl px-4 py-3 flex justify-between'><Link to='/' className='font-semibold'>Museum Demo</Link><div className='text-sm flex gap-3'><Link to='/'>Katalog</Link><Link to='/feedback'>Připomínka</Link><Link to='/admin'>Admin</Link></div></div></div><Routes><Route path='/' element={<Catalog/>}/><Route path='/items/:id' element={<Detail/>}/><Route path='/feedback' element={<Feedback/>}/><Route path='/admin' element={<Admin/>}/><Route path='*' element={<Navigate to='/' replace/>}/></Routes></div>)}
