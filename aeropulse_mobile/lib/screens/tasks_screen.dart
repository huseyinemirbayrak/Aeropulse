import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';

class TasksScreen extends StatefulWidget {
  const TasksScreen({Key? key}) : super(key: key);

  @override
  State<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends State<TasksScreen> {
  List<dynamic> _faults = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadFaults();
  }

  Future<void> _loadFaults() async {
    setState(() => _isLoading = true);
    final apiService = Provider.of<ApiService>(context, listen: false);
    final faults = await apiService.getMyFaults();
    setState(() {
      _faults = faults;
      _isLoading = false;
    });
  }

  Future<void> _handleLogout() async {
    final apiService = Provider.of<ApiService>(context, listen: false);
    await apiService.logout();
    if (mounted) {
      Navigator.pushReplacementNamed(context, '/login');
    }
  }

  void _showResolveDialog(Map<String, dynamic> fault) {
    final noteController = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Arızayı Çöz'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Uçak: ${fault['aircraftTailNumber']}'),
            const SizedBox(height: 8),
            Text('Açıklama: ${fault['description']}'),
            const SizedBox(height: 16),
            TextField(
              controller: noteController,
              decoration: const InputDecoration(
                labelText: 'Çözüm Notları',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('İptal'),
          ),
          ElevatedButton(
            onPressed: () async {
              final apiService = Provider.of<ApiService>(context, listen: false);
              final success = await apiService.resolveFault(
                fault['id'],
                noteController.text.trim(),
              );
              
              if (mounted) {
                Navigator.pop(context); // Close dialog
                if (success) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Arıza başarıyla çözüldü!')),
                  );
                  _loadFaults(); // Reload list
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('İşlem başarısız oldu.')),
                  );
                }
              }
            },
            child: const Text('Çözüldü İşaretle'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Görevlerim'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadFaults,
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: _handleLogout,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _faults.isEmpty
              ? const Center(
                  child: Text(
                    'Şu an için atanan bir göreviniz bulunmuyor. 🎉',
                    style: TextStyle(fontSize: 16),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadFaults,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: _faults.length,
                    itemBuilder: (context, index) {
                      final fault = _faults[index];
                      final isResolved = fault['status'] == 'Resolved';
                      
                      return Card(
                        elevation: 2,
                        margin: const EdgeInsets.only(bottom: 12),
                        child: ListTile(
                          contentPadding: const EdgeInsets.all(16),
                          leading: CircleAvatar(
                            backgroundColor: isResolved ? Colors.green : Colors.orange,
                            child: Icon(
                              isResolved ? Icons.check : Icons.build,
                              color: Colors.white,
                            ),
                          ),
                          title: Text(
                            fault['description'] ?? 'Açıklama yok',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          subtitle: Padding(
                            padding: const EdgeInsets.only(top: 8.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Uçak: ${fault['aircraftTailNumber']}'),
                                Text('Öncelik: ${fault['priority']}'),
                                Text('Tarih: ${fault['createdAt'] != null ? fault['createdAt'].toString().substring(0, 10) : '-'}'),
                              ],
                            ),
                          ),
                          trailing: isResolved
                              ? const Chip(
                                  label: Text('Çözüldü', style: TextStyle(color: Colors.white)),
                                  backgroundColor: Colors.green,
                                )
                              : ElevatedButton(
                                  onPressed: () => _showResolveDialog(fault),
                                  child: const Text('İşi Bitir'),
                                ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
