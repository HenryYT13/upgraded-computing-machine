import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Plus, LayoutDashboard, List, Edit, Trash2, X, BookOpen, Truck, Search, FilterX, Dices } from 'lucide-react';

// Initialize Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  const [deliveries, setDeliveries] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  
  const [filters, setFilters] = useState({
    searchCode: '', fromDate: '', toDate: '', customer: 'Tất cả', status: 'Tất cả'
  });
  
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

  const uniqueCustomers = ['Tất cả', ...new Set(deliveries.map(d => d.customer_name).filter(Boolean))];
  const filterStatuses = ['Tất cả', ...statuses];

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

  const randomizeOrderCode = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setFormData({ ...formData, order_code: `DV${randomNum}` });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  const clearFilters = () => {
    setFilters({ searchCode: '', fromDate: '', toDate: '', customer: 'Tất cả', status: 'Tất cả' });
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
        setShowForm(false);
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
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setFormData(defaultForm);
    setEditingId(null);
    setShowForm(false);
  };

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase.from('deliveries').update({ status: newStatus }).eq('id', id);
    if (!error) {
      setDeliveries(deliveries.map(d => d.id === id ? { ...d, status: newStatus } : d));
    } else alert('Lỗi cập nhật trạng thái: ' + error.message);
  };

  const filteredDeliveries = deliveries.filter(d => {
    if (filters.searchCode && !d.order_code?.toLowerCase().includes(filters.searchCode.toLowerCase())) return false;
    if (filters.fromDate && d.order_date < filters.fromDate) return false;
    if (filters.toDate && d.order_date > filters.toDate) return false;
    if (filters.customer !== 'Tất cả' && d.customer_name !== filters.customer) return false;
    if (filters.status !== 'Tất cả' && d.status !== filters.status) return false;
    return true;
  });

  const exportToCSV = () => {
    const headers = [
      'STT', 'Mã đơn', 'Ngày', 'Khách hàng', 'SĐT', 'Địa chỉ giao', 'Hàng hóa', 
      'Số lượng', 'Đơn vị vận chuyển', 'Tài xế', 'Biển số', 'Giờ xuất', 'Dự kiến đến', 
      'Giờ giao thực tế', 'Trạng thái', 'Phí vận chuyển', 'Tiền hàng', 'Người nhận', 'Ghi chú'
    ];
    const rows = filteredDeliveries.map((d, index) => [
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

  // --- DASHBOARD AGGREGATIONS ---
  const totalOrders = filteredDeliveries.length;
  const totalDelivered = filteredDeliveries.filter(d => d.status === 'Đã giao').length;
  const totalShipping = filteredDeliveries.filter(d => d.status === 'Đang vận chuyển').length;
  const totalFailed = filteredDeliveries.filter(d => d.status === 'Giao thất bại').length;
  const totalCancelled = filteredDeliveries.filter(d => d.status === 'Đã hủy').length;
  const totalPrep = filteredDeliveries.filter(d => d.status === 'Chuẩn bị').length;
  const totalQuantity = filteredDeliveries.reduce((sum, d) => sum + Number(d.quantity || 0), 0);
  const totalShippingFee = filteredDeliveries.reduce((sum, d) => sum + Number(d.shipping_fee || 0), 0);
  const totalOrderAmount = filteredDeliveries.reduce((sum, d) => sum + Number(d.order_amount || 0), 0);

  const driverStats = {};
  filteredDeliveries.forEach(d => {
    let driver = (d.driver_name || '').trim();
    if (driver === '') driver = 'Tài xế khác'; 
    if (!driverStats[driver]) driverStats[driver] = { count: 0, fee: 0 };
    driverStats[driver].count += 1;
    driverStats[driver].fee += Number(d.shipping_fee || 0);
  });
  
  const driverArray = Object.keys(driverStats).map(name => ({
    name,
    count: driverStats[name].count,
    fee: driverStats[name].fee
  })).sort((a, b) => {
    if (a.name === 'Tài xế khác') return 1;
    if (b.name === 'Tài xế khác') return -1;
    return b.count - a.count;
  });

  const chartData = [
    { name: 'Đã giao', value: totalDelivered, color: '#84cc16' },
    { name: 'Đang vận chuyển', value: totalShipping, color: '#ef4444' },
    { name: 'Chuẩn bị', value: totalPrep, color: '#f59e0b' },
    { name: 'Giao thất bại', value: totalFailed, color: '#6366f1' },
    { name: 'Đã hủy', value: totalCancelled, color: '#64748b' }
  ].filter(d => d.value > 0);

  const getStatusStyle = (status) => {
    if (status === 'Đã giao') return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
    if (status === 'Đang vận chuyển') return 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100';
    if (status === 'Giao thất bại' || status === 'Đã hủy') return 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200';
    return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100';
  };

  const inputClass = "w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent px-3 py-2.5 outline-none transition-all";
  const labelClass = "text-xs font-medium text-slate-500 mb-1.5 block uppercase tracking-wider";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-sm shadow-indigo-200">
              <Truck size={20} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Logistics<span className="text-indigo-600">Hub</span></h1>
          </div>
          
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200/60 shadow-inner overflow-x-auto">
            <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
              <LayoutDashboard size={16} /> Tổng hợp
            </button>
            <button onClick={() => setActiveTab('data')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${activeTab === 'data' ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
              <List size={16} /> Dữ liệu
            </button>
            <button onClick={() => setActiveTab('manual')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${activeTab === 'manual' ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>
              <BookOpen size={16} /> Hướng dẫn
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* TAB 1: DASHBOARD (Borderless Clean Tables) */}
        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-2xl font-bold text-blue-700 mb-6 tracking-wide">TỔNG HỢP VẬN CHUYỂN</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-10">
              
              <div className="space-y-10">
                {/* Main Summary Table - Borderless */}
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-blue-50/50 font-bold text-slate-800">
                      <td className="py-3 px-2 w-2/3">Tổng số đơn/chuyến</td>
                      <td className="py-3 px-2 text-right">{totalOrders}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 text-slate-600">
                      <td className="py-3 px-2">Đã giao</td>
                      <td className="py-3 px-2 text-right font-medium text-slate-900">{totalDelivered}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 text-slate-600">
                      <td className="py-3 px-2">Đang vận chuyển</td>
                      <td className="py-3 px-2 text-right font-medium text-slate-900">{totalShipping}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 text-slate-600">
                      <td className="py-3 px-2">Giao thất bại</td>
                      <td className="py-3 px-2 text-right font-medium text-slate-900">{totalFailed}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50 text-slate-600">
                      <td className="py-3 px-2">Đã hủy</td>
                      <td className="py-3 px-2 text-right font-medium text-slate-900">{totalCancelled}</td>
                    </tr>
                    <tr className="bg-slate-50/50 font-semibold text-slate-800">
                      <td className="py-3 px-2">Tổng số lượng hàng</td>
                      <td className="py-3 px-2 text-right">{totalQuantity}</td>
                    </tr>
                    <tr className="bg-slate-50/50 font-semibold text-slate-800">
                      <td className="py-3 px-2">Tổng phí vận chuyển</td>
                      <td className="py-3 px-2 text-right">{totalShippingFee.toLocaleString()}</td>
                    </tr>
                    <tr className="bg-blue-50/50 font-bold text-slate-900 text-base">
                      <td className="py-3 px-2">Tổng tiền hàng</td>
                      <td className="py-3 px-2 text-right text-emerald-600">{totalOrderAmount.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Driver Summary Table - Borderless */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-slate-400 font-semibold border-b border-slate-100">
                      <th className="py-3 px-2 text-left">Tài xế</th>
                      <th className="py-3 px-2 text-right">Số chuyến</th>
                      <th className="py-3 px-2 text-right">Phí vận chuyển</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {driverArray.map((driver, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 text-slate-700">
                        <td className="py-3 px-2 font-medium">{driver.name}</td>
                        <td className="py-3 px-2 text-right">{driver.count}</td>
                        <td className="py-3 px-2 text-right">{driver.fee.toLocaleString()}</td>
                      </tr>
                    ))}
                    {driverArray.length === 0 && (
                      <tr><td colSpan="3" className="py-4 text-center text-slate-400">Chưa có dữ liệu</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="space-y-10">
                <div className="p-6 flex flex-col items-center bg-slate-50/50 rounded-2xl border border-slate-100 shadow-sm">
                  <h3 className="font-bold text-slate-500 mb-6 text-sm uppercase tracking-wider">Tỷ lệ theo trạng thái</h3>
                  <div className="w-full h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartData} innerRadius={0} outerRadius={110} dataKey="value" stroke="none">
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: DATA & INPUT */}
        {activeTab === 'data' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                  <Search size={16} className="text-indigo-600"/> TÌM KIẾM ĐƠN HÀNG
                </h3>
                <button onClick={() => setShowForm(!showForm)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm ${showForm ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                  {showForm ? <X size={16} /> : <Plus size={16} />}
                  {showForm ? 'Đóng form' : 'Thêm mới'}
                </button>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-6 gap-4 items-end bg-white">
                <div><label className={labelClass}>Mã đơn (Tìm kiếm)</label><input type="text" name="searchCode" value={filters.searchCode} onChange={handleFilterChange} placeholder="Nhập mã đơn..." className={inputClass} /></div>
                <div><label className={labelClass}>Từ ngày</label><input type="date" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} className={inputClass} /></div>
                <div><label className={labelClass}>Đến ngày</label><input type="date" name="toDate" value={filters.toDate} onChange={handleFilterChange} className={inputClass} /></div>
                <div><label className={labelClass}>Khách hàng</label><select name="customer" value={filters.customer} onChange={handleFilterChange} className={inputClass}>{uniqueCustomers.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className={labelClass}>Trạng thái</label><select name="status" value={filters.status} onChange={handleFilterChange} className={inputClass}>{filterStatuses.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div>
                  <button onClick={clearFilters} className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg font-medium transition-colors border border-slate-200">
                    <FilterX size={16} /> Bỏ lọc
                  </button>
                </div>
              </div>
            </div>

            {showForm && (
              <div className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 animate-in slide-in-from-top-4 ${editingId ? 'ring-2 ring-amber-400 border-amber-400 shadow-amber-100' : 'border-indigo-200 ring-1 ring-indigo-100'}`}>
                <div className={`px-6 py-4 border-b flex justify-between items-center rounded-t-2xl ${editingId ? 'bg-amber-50 border-amber-100' : 'bg-indigo-50 border-indigo-100'}`}>
                  <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                    {editingId ? <><Edit size={18} className="text-amber-600"/> Đang Cập Nhật Đơn Hàng</> : <><Plus size={18} className="text-indigo-600"/> Thêm Đơn Hàng Mới</>}
                  </h2>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-5">
                    
                    <div>
                      <label className={labelClass}>Mã đơn <span className="text-rose-500">*</span></label>
                      <div className="flex gap-2">
                        <input required name="order_code" value={formData.order_code} onChange={handleInputChange} placeholder="VD: DV003" className={inputClass} />
                        <button type="button" onClick={randomizeOrderCode} title="Random Mã Đơn" className="px-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center justify-center">
                          <Dices size={18} />
                        </button>
                      </div>
                    </div>

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

                  <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
                    {editingId && (
                      <button type="button" onClick={handleCancelEdit} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors">
                        Hủy
                      </button>
                    )}
                    <button type="submit" className={`px-8 py-2.5 rounded-lg font-medium text-white shadow-sm transition-all focus:ring-2 focus:ring-offset-2 ${editingId ? 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500' : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'}`}>
                      {editingId ? 'Lưu Cập Nhật' : 'Thêm Đơn Hàng'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800">
                  Danh Sách Đơn Hàng 
                  <span className="ml-2 text-sm font-normal text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">{filteredDeliveries.length} kết quả</span>
                </h2>
                <button onClick={exportToCSV} className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
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
                      <th className="px-4 py-4 text-center">Số lượng</th>
                      <th className="px-4 py-4">Đơn vị vận chuyển</th>
                      <th className="px-4 py-4">Tài xế</th>
                      <th className="px-4 py-4">Biển số</th>
                      <th className="px-4 py-4">Giờ xuất</th>
                      <th className="px-4 py-4">Dự kiến</th>
                      <th className="px-4 py-4">Giờ thực tế</th>
                      <th className="px-4 py-4">Trạng thái</th>
                      <th className="px-4 py-4 text-right">Phí vận tể</th>
                      <th className="px-4 py-4 text-right">Tiền hàng</th>
                      <th className="px-4 py-4">Người nhận</th>
                      <th className="px-4 py-4">Ghi chú</th>
                      <th className="px-4 py-4 sticky right-0 bg-slate-50 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredDeliveries.length === 0 && (
                      <tr><td colSpan="20" className="text-center py-12 text-slate-400">Không tìm thấy đơn hàng nào phù hợp.</td></tr>
                    )}
                    {filteredDeliveries.map((d, index) => (
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
                    Lọc và Thêm mới đơn hàng
                  </h3>
                  <div className="ml-11 text-slate-600 text-sm leading-relaxed space-y-3">
                    <p>Thanh <b>TÌM KIẾM ĐƠN HÀNG</b> cho phép bạn lọc dữ liệu theo Mã đơn, khoảng thời gian, khách hàng và trạng thái.</p>
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
