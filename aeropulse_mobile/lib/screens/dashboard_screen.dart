import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({Key? key}) : super(key: key);

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _isLoading = true;
  Map<String, dynamic>? _metrics;

  @override
  void initState() {
    super.initState();
    _loadMetrics();
  }

  Future<void> _loadMetrics() async {
    setState(() => _isLoading = true);
    final apiService = Provider.of<ApiService>(context, listen: false);
    final data = await apiService.getDashboardMetrics();
    
    if (mounted) {
      setState(() {
        _metrics = data;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_metrics == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('Veriler alınamadı.'),
            ElevatedButton(
              onPressed: _loadMetrics,
              child: const Text('Tekrar Dene'),
            )
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadMetrics,
      child: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          const Text(
            'Genel Durum',
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: _buildStatCard('Açık Arızalar', _metrics?['openFaults']?.toString() ?? '0', Colors.orange)),
              const SizedBox(width: 16),
              Expanded(child: _buildStatCard('Kritik Arızalar', _metrics?['criticalFaults']?.toString() ?? '0', Colors.red)),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: _buildStatCard('Aktif Uçaklar', _metrics?['activeAircraft']?.toString() ?? '0', Colors.blue)),
              const SizedBox(width: 16),
              Expanded(child: _buildStatCard('Bakımdaki Uçaklar', _metrics?['inMaintenanceAircraft']?.toString() ?? '0', Colors.grey)),
            ],
          ),
          const SizedBox(height: 32),
          const Text(
            'Son Arızalar',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          ...(_metrics?['recentFaults'] as List<dynamic>? ?? []).map((fault) {
            return Card(
              child: ListTile(
                leading: const Icon(Icons.warning, color: Colors.orange),
                title: Text(fault['aircraftTailNumber'] ?? 'Bilinmeyen'),
                subtitle: Text(fault['description'] ?? ''),
                trailing: Text(fault['priorityName'] ?? 'Low'),
              ),
            );
          }).toList(),
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, String value, Color color) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(fontSize: 14, color: Colors.grey[600]),
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: color),
            ),
          ],
        ),
      ),
    );
  }
}
