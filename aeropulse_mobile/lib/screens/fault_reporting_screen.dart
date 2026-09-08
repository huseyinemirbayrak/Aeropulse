import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';

class FaultReportingScreen extends StatefulWidget {
  const FaultReportingScreen({Key? key}) : super(key: key);

  @override
  State<FaultReportingScreen> createState() => _FaultReportingScreenState();
}

class _FaultReportingScreenState extends State<FaultReportingScreen> {
  final _formKey = GlobalKey<FormState>();
  final _descriptionController = TextEditingController();
  final _aircraftIdController = TextEditingController();
  
  int _selectedPriority = 1; // Medium
  bool _isSubmitting = false;

  Future<void> _submitFault() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);
    
    final apiService = Provider.of<ApiService>(context, listen: false);
    final success = await apiService.createFaultReport(
      _aircraftIdController.text,
      _selectedPriority,
      _descriptionController.text,
    );

    if (!mounted) return;

    setState(() => _isSubmitting = false);

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Arıza başarıyla bildirildi.')),
      );
      _descriptionController.clear();
      _aircraftIdController.clear();
      // Reset priority
      setState(() => _selectedPriority = 1);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Arıza bildirilirken bir hata oluştu.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Yeni Arıza Bildirimi',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 24),
            TextFormField(
              controller: _aircraftIdController,
              decoration: const InputDecoration(
                labelText: 'Uçak ID (Kuyruk No yerine ID)',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.flight),
              ),
              validator: (value) => value == null || value.isEmpty ? 'Gerekli alan' : null,
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<int>(
              value: _selectedPriority,
              decoration: const InputDecoration(
                labelText: 'Öncelik Seviyesi',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.priority_high),
              ),
              items: const [
                DropdownMenuItem(value: 0, child: Text('Düşük')),
                DropdownMenuItem(value: 1, child: Text('Orta')),
                DropdownMenuItem(value: 2, child: Text('Yüksek')),
                DropdownMenuItem(value: 3, child: Text('Kritik')),
              ],
              onChanged: (value) {
                if (value != null) {
                  setState(() => _selectedPriority = value);
                }
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _descriptionController,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Arıza Açıklaması',
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
              validator: (value) => value == null || value.isEmpty ? 'Gerekli alan' : null,
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: _isSubmitting ? null : _submitFault,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: _isSubmitting 
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('BİLDİR', style: TextStyle(fontSize: 16)),
            ),
          ],
        ),
      ),
    );
  }
}
