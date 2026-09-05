import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Plus, LayoutDashboard, List, Edit, Trash2, X, BookOpen, Truck, Package } from 'lucide-react';

// Initialize Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  const [deliveries, setDeliveries] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingId, setEditingId] = useState(null);
  
  const defaultForm = {
    order_code: '', order_date: new Date().toISOString().split('T')[0],
    customer_name: '', phone: '', delivery_address: '', product_name: '',
    quantity: '', carrier_unit: 'Nội bộ', driver_name: '', license_plate: '',
    departure_time: '', estimated_arrival: '', actual_arrival: '',
    status: 'Chuẩn bị', shipping_fee: 0, order_amount: 0, receiver_name: '', notes: ''
  };

  const [formData, setFormData] = useState(defaultForm);
  const statuses = ['Đã giao', 'Đang vận chuyển', 'Chuẩn bị', 'Giao thất bại', 'Đã hủy'];
  const carrierUnits = ['Nội bộ', 'Đối tác', 'Nhà xe', 'Chuyển phát'];

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    const { data, error } = await supabase.from('deliveries').select('*').order('created_at', { ascending: false });
    if (!error) setDeliveries(data);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const submitData = { ...formData };
    if (!submitData.departure_time) submitData.departure_time = null;
    if (!submitData.estimated_arrival) submitData.estimated_arrival = null;
    if (!submitData.actual_arrival) submitData.actual_arrival = null;
    if (!submitData.quantity) submitData.quantity = 0;

    delete submitData.id; delete submitData.created_at;

    if (editingId) {
      const { error } = await supabase.from('deliveries').update(submitData).eq('id', editingId);
      if (!error) {
        alert('Đã cập nhật đơn hàng thành công!');
        fetchDeliveries();
        handleCancelEdit();
      } else alert('Lỗi cập nhật: ' + error.message);
    } else {
      const { error } = await supabase.from('deliveries').insert([submitData]);
      if (!error) {
        alert('Đã thêm đơn hàng thành công!'); 
        fetchDeliveries();
        setFormData(defaultForm);
      } else alert('Lỗi thêm mới: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đơn hàng này vĩnh viễn?')) return;
    const { error } = await supabase.from('deliveries').delete().eq('id', id);
    if (!error) {
      setDeliveries(deliveries.filter(d => d.id !== id));
      if (editingId === id) handleCancelEdit();
    } else alert('Lỗi khi xóa: ' + error.message);
  };

  const handleEdit = (delivery) => {
    setActiveTab('data');
    setFormData(delivery);
    setEditingId(delivery.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setFormData(defaultForm);
    setEditingId(null);
  };

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase.from('deliveries').update({ status: newStatus }).eq('id', id);
    if (!error) {
      setDeliveries(deliveries.map(d => d.id === id ? { ...d, status: newStatus } : d));
    } else alert('Lỗi cập nhật trạng thái: ' + error.message);
  };

  const exportToCSV = () => {
    const headers = [
      'STT', 'Mã đơn', 'Ngày', 'Khách hàng', 'SĐT', 'Địa chỉ giao', 'Hàng hóa', 
      'SL', 'Đơn vị VC', 'Tài xế', 'Biển số', 'Giờ xuất', 'Dự kiến đến', 
      'Giờ giao thực tế', 'Trạng thái', 'Phí VC', 'Tiền hàng', 'Người nhận', 'Ghi chú'
    ];
    const rows = deliveries.map((d, index) => [
      index + 1, d.order_code, d.order_date, d.customer_name, d.phone, `"${d.delivery_address || ''}"`, 
      d.product_name, d.quantity, d.carrier_unit, d.driver_name, d.license_plate, 
      d.departure_time || '', d.estimated_arrival || '', d.actual_arrival || '', 
      d.status, d.shipping_fee, d.order_amount, d.receiver_name, `"${d.notes || ''}"`
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Xuat_Van_Chuyen_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#f43f5e', '#64748b'];
  const chartData = statuses.map((status, index) => ({
    name: status, value: deliveries.filter(d => d.status === status).length, color: COLORS[index]
  })).filter(d => d.value > 0);

  const getStatusStyle = (status) => {
    if (status === 'Đã giao') return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
    if (status === 'Đang vận chuyển') return 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100';
    if (status === 'Giao thất bại' || status === 'Đã hủy') return 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100';
    return 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100';
  };

  // Reusable input class for the clean UI
  const inputClass = "w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent px-3 py-2.5 outline-none transition-all";
  const labelClass = "text-xs font-medium text-slate-500 mb-1.5 block uppercase tracking-wider";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-sm shadow-indigo-200">
              <Truck size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Logistics<span className="text-indigo-600">Hub</span></h1>
          </div>
          
          {/* Segmented Control Tabs */}
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200/60 shadow-inner">
            <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
              <LayoutDashboard size={16} /> Tổng hợp
            </button>
            <button onClick={() => setActiveTab('data')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'data' ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
              <List size={16} /> Dữ liệu
            </button>
            <button onClick={() => setActiveTab('manual')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'manual' ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
              <BookOpen size={16} /> Hướng dẫn
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Stats Column */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Package size={20}/></div>
                  <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Tổng Đơn Hàng</h3>
                </div>
                <div className="text-4xl font-bold text-slate-900 mt-2">{deliveries.length}</div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Tổng Tiền Hàng</h3>
                <div className="text-3xl font-bold text-emerald-600">
                  {deliveries.reduce((sum, d) => sum + Number(d.order_amount || 0), 0).toLocaleString()} <span className="text-lg text-emerald-400">VNĐ</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Tổng Phí Vận Chuyển</h3>
                <div className="text-3xl font-bold text-indigo-600">
                  {deliveries.reduce((sum, d) => sum + Number(d.shipping_fee || 0), 0).toLocaleString()} <span className="text-lg text-indigo-400">VNĐ</span>
                </div>
              </div>
            </div>

            {/* Chart Column */}
            <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
              <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">Phân Bố Trạng Thái</h2>
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} innerRadius={80} outerRadius={130} paddingAngle={5} dataKey="value" stroke="none">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DATA & INPUT */}
        {activeTab === 'data' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* INPUT FORM CARD */}
            <div className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 ${editingId ? 'ring-2 ring-amber-400 border-amber-400 shadow-amber-100' : 'border-slate-200'}`}>
              <div className={`px-6 py-4 border-b flex justify-between items-center rounded-t-2xl ${editingId ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-100'}`}>
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                  {editingId ? <><Edit size={18} className="text-amber-600"/> Đang Cập Nhật Đơn Hàng</> : <><Plus size={18} className="text-indigo-600"/> Thêm Đơn Hàng Mới</>}
                </h2>
                {editingId && (
                  <button onClick={handleCancelEdit} className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm font-medium bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm transition-colors">
                    <X size={14}/> Hủy
                  </button>
                )}
              </div>
              
              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-5">
                  <div><label className={labelClass}>Mã đơn <span className="text-rose-500">*</span></label><input required name="order_code" value={formData.order_code} onChange={handleInputChange} placeholder="VD: DV003" className={inputClass} /></div>
                  <div><label className={labelClass}>Ngày <span className="text-rose-500">*</span></label><input required type="date" name="order_date" value={formData.order_date} onChange={handleInputChange} className={inputClass} /></div>
                  <div><label className={labelClass}>Khách hàng <span className="text-rose-500">*</span></label><input required name="customer_name" value={formData.customer_name} onChange={handleInputChange} placeholder="Tên khách hàng" className={inputClass} /></div>
                  <div><label className={labelClass}>Số điện thoại</label><input name="phone" value={formData.phone} onChange={handleInputChange} placeholder="SĐT khách" className={inputClass} /></div>
                  
                  <div className="md:col-span-2"><label className={labelClass}>Địa chỉ giao</label><input name="delivery_address" value={formData.delivery_address} onChange={handleInputChange} placeholder="Địa chỉ chi tiết" className={inputClass} /></div>
                  <div><label className={labelClass}>Hàng hóa</label><input name="product_name" value={formData.product_name} onChange={handleInputChange} placeholder="Tên hàng hóa" className={inputClass} /></div>
                  <div><label className={labelClass}>Số lượng</label><input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} placeholder="0" className={inputClass} /></div>

                  <div><label className={labelClass}>Đơn vị VC</label><select name="carrier_unit" value={formData.carrier_unit} onChange={handleInputChange} className={inputClass}>{carrierUnits.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div><label className={labelClass}>Tài xế</label><input name="driver_name" value={formData.driver_name} onChange={handleInputChange} placeholder="Tên tài xế" className={inputClass} /></div>
                  <div><label className={labelClass}>Biển số</label><input name="license_plate" value={formData.license_plate} onChange={handleInputChange} placeholder="BKS xe" className={inputClass} /></div>
                  <div><label className={labelClass}>Trạng thái</label><select name="status" value={formData.status} onChange={handleInputChange} className={inputClass}>{statuses.map(s => <option key={s} value={s}>{s}</option>)}</select></div>

                  <div><label className={labelClass}>Giờ xuất</label><input type="time" name="departure_time" value={formData.departure_time} onChange={handleInputChange} className={inputClass} /></div>
                  <div><label className={labelClass}>Dự kiến đến</label><input type="time" name="estimated_arrival" value={formData.estimated_arrival} onChange={handleInputChange} className={inputClass} /></div>
                  <div><label className={labelClass}>Giờ giao thực tế</label><input type="time" name="actual_arrival" value={formData.actual_arrival} onChange={handleInputChange} className={inputClass} /></div>
                  <div><label className={labelClass}>Người nhận</label><input name="receiver_name" value={formData.receiver_name} onChange={handleInputChange} placeholder="Tên người nhận" className={inputClass} /></div>

                  <div className="md:col-span-2"><label className={labelClass}>Phí vận chuyển (VNĐ)</label><input type="number" name="shipping_fee" value={formData.shipping_fee} onChange={handleInputChange} placeholder="0" className={inputClass} /></div>
                  <div className="md:col-span-2"><label className={labelClass}>Tiền hàng (VNĐ)</label><input type="number" name="order_amount" value={formData.order_amount} onChange={handleInputChange} placeholder="0" className={inputClass} /></div>

                  <div className="md:col-span-4"><label className={labelClass}>Ghi chú</label><input name="notes" value={formData.notes} onChange={handleInputChange} placeholder="Nhập ghi chú thêm..." className={inputClass} /></div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                  <button type="submit" className={`px-8 py-2.5 rounded-lg font-medium text-white shadow-sm transition-all focus:ring-2 focus:ring-offset-2 ${editingId ? 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'}`}>
                    {editingId ? 'Lưu Cập Nhật' : 'Thêm Đơn Hàng'}
                  </button>
                </div>
              </form>
            </div>

            {/* DATA TABLE CARD */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800">Danh Sách Đơn Hàng</h2>
                <button onClick={exportToCSV} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
                  <Download size={16} /> Xuất File CSV
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-medium border-b border-slate-200">
                      <th className="px-4 py-4">STT</th>
                      <th className="px-4 py-4">Mã đơn</th>
                      <th className="px-4 py-4">Ngày</th>
                      <th className="px-4 py-4">Khách hàng</th>
                      <th className="px-4 py-4">SĐT</th>
                      <th className="px-4 py-4">Địa chỉ giao</th>
                      <th className="px-4 py-4">Hàng hóa</th>
                      <th className="px-4 py-4 text-center">SL</th>
                      <th className="px-4 py-4">Đơn vị VC</th>
                      <th className="px-4 py-4">Tài xế</th>
                      <th className="px-4 py-4">Biển số</th>
                      <th className="px-4 py-4">Giờ xuất</th>
                      <th className="px-4 py-4">Dự kiến</th>
                      <th className="px-4 py-4">Giờ TT</th>
                      <th className="px-4 py-4">Trạng thái</th>
                      <th className="px-4 py-4 text-right">Phí VC</th>
                      <th className="px-4 py-4 text-right">Tiền hàng</th>
                      <th className="px-4 py-4">Người nhận</th>
                      <th className="px-4 py-4">Ghi chú</th>
                      <th className="px-4 py-4 sticky right-0 bg-slate-50 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {deliveries.length === 0 && (
                      <tr><td colSpan="20" className="text-center py-12 text-slate-400">Chưa có dữ liệu. Hãy thêm đơn hàng đầu tiên!</td></tr>
                    )}
                    {deliveries.map((d, index) => (
                      <tr key={d.id} className={`hover:bg-slate-50/80 text-sm transition-colors ${editingId === d.id ? 'bg-amber-50/50' : ''}`}>
                        <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{d.order_code}</td>
                        <td className="px-4 py-3 text-slate-600">{d.order_date}</td>
                        <td className="px-4 py-3 text-slate-900">{d.customer_name}</td>
                        <td className="px-4 py-3 text-slate-600">{d.phone}</td>
                        <td className="px-4 py-3 text-slate-600 truncate max-w-[150px]" title={d.delivery_address}>{d.delivery_address}</td>
                        <td className="px-4 py-3 text-slate-600">{d.product_name}</td>
                        <td className="px-4 py-3 text-center text-slate-600">
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium text-xs">{d.quantity}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{d.carrier_unit}</td>
                        <td className="px-4 py-3 text-slate-600">{d.driver_name}</td>
                        <td className="px-4 py-3 text-slate-600">{d.license_plate}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{d.departure_time ? d.departure_time.substring(0,5) : '-'}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{d.estimated_arrival ? d.estimated_arrival.substring(0,5) : '-'}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">{d.actual_arrival ? d.actual_arrival.substring(0,5) : '-'}</td>
                        <td className="px-4 py-3">
                          <select 
                            value={d.status} 
                            onChange={(e) => updateStatus(d.id, e.target.value)}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer border outline-none transition-colors appearance-none ${getStatusStyle(d.status)}`}
                          >
                            {statuses.map(s => <option key={s} value={s} className="bg-white text-slate-900">{s}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">{Number(d.shipping_fee || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-600">{Number(d.order_amount || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-600">{d.receiver_name}</td>
                        <td className="px-4 py-3 text-slate-500 truncate max-w-[150px]" title={d.notes}>{d.notes}</td>
                        
                        <td className="px-4 py-3 sticky right-0 bg-white group-hover:bg-slate-50/80 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] border-l border-slate-100 transition-colors">
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => handleEdit(d)} title="Sửa" className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                              <Edit size={16} strokeWidth={2.5} />
                            </button>
                            <button onClick={() => handleDelete(d.id)} title="Xóa" className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                              <Trash2 size={16} strokeWidth={2.5} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MANUAL */}
        {activeTab === 'manual' && (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-200">
              <div className="text-center mb-10 border-b border-slate-100 pb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 mb-4">
                  <BookOpen size={32} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3">Hướng Dẫn Sử Dụng Hệ Thống</h2>
                <p className="text-slate-500 max-w-xl mx-auto">
                  Ứng dụng quản lý vận chuyển nội bộ. Giao diện tối giản, lưu trữ đám mây thời gian thực, thay thế hoàn toàn quy trình sử dụng Excel truyền thống.
                </p>
              </div>

              <div className="space-y-12">
                <section>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 text-sm">1</span> 
                    Quản lý dữ liệu
                  </h3>
                  <div className="ml-11 text-slate-600 text-sm leading-relaxed space-y-3">
                    <p>Tab <b>Dữ liệu</b> là nơi thao tác chính. Các trường có dấu sao đỏ (<span className="text-rose-500">*</span>) là bắt buộc. Sau khi điền, bấm <b>Thêm Đơn Hàng</b> để lưu vào hệ thống.</p>
                    <p>Cột <b>Thao tác</b> ở bên phải cùng của bảng cho phép <span className="text-indigo-600 font-medium">Sửa</span> hoặc <span className="text-rose-600 font-medium">Xóa</span> đơn hàng vĩnh viễn.</p>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 text-sm">2</span> 
                    Cập nhật trạng thái
                  </h3>
                  <div className="ml-11 text-slate-600 text-sm leading-relaxed">
                    <p>Trong danh sách, click trực tiếp vào <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium text-xs border border-slate-200 mx-1">Trạng thái</span> của đơn hàng để đổi nhanh sang trạng thái khác. Biểu đồ ở tab Tổng hợp sẽ tự động thay đổi theo thời gian thực.</p>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 text-sm">3</span> 
                    Xuất báo cáo
                  </h3>
                  <div className="ml-11 text-slate-600 text-sm leading-relaxed">
                    <p>Nút <b>Xuất File CSV</b> tự động tải xuống dữ liệu hiện tại với định dạng UTF-8 chuẩn. Bạn có thể mở trực tiếp bằng Excel mà không bị lỗi font Tiếng Việt.</p>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}