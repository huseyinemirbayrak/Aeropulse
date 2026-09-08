import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  // Use 10.0.2.2 for Android Emulator connecting to localhost
  // Use 127.0.0.1 or localhost for iOS Simulator
  static const String baseUrl = 'http://10.0.2.2:5146/api';

  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('jwt_token');
  }

  Future<bool> login(String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/Auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final token = data['data']['token'];
        
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('jwt_token', token);
        return true;
      }
      return false;
    } catch (e) {
      print('Login error: $e');
      return false;
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('jwt_token');
  }

  Future<List<dynamic>> getMyFaults() async {
    try {
      final token = await _getToken();
      if (token == null) throw Exception('No token found');

      final response = await http.get(
        Uri.parse('$baseUrl/fault-reports/my-faults'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['data'] ?? [];
      }
      throw Exception('Failed to load faults');
    } catch (e) {
      print('Get faults error: $e');
      return [];
    }
  }

  Future<bool> resolveFault(String faultId, String resolutionNotes) async {
    try {
      final token = await _getToken();
      if (token == null) return false;

      final response = await http.put(
        Uri.parse('$baseUrl/fault-reports/$faultId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'status': 'Resolved',
          'resolutionNotes': resolutionNotes,
        }),
      );

      return response.statusCode == 200;
    } catch (e) {
      print('Resolve fault error: $e');
      return false;
    }
  }

  Future<Map<String, dynamic>?> getDashboardMetrics() async {
    try {
      final token = await _getToken();
      if (token == null) return null;

      final response = await http.get(
        Uri.parse('$baseUrl/Dashboard/viewer'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        // data or data['data'] depending on ApiResponse wrapper. The API returns ApiResponse<T> mostly, but wait, DashboardController does `return Ok(result);` and result is already wrapped in some services, or maybe not. We will just return data. Let's assume ApiResponse format or direct.
        // I will return data to be safe, the UI can parse it.
        return data['data'] ?? data;
      }
      return null;
    } catch (e) {
      print('Dashboard metrics error: $e');
      return null;
    }
  }

  Future<bool> createFaultReport(String aircraftId, int priority, String description) async {
    try {
      final token = await _getToken();
      if (token == null) return false;

      final response = await http.post(
        Uri.parse('$baseUrl/fault-reports'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'aircraftId': aircraftId,
          'priority': priority,
          'description': description,
        }),
      );

      return response.statusCode == 201 || response.statusCode == 200;
    } catch (e) {
      print('Create fault error: $e');
      return false;
    }
  }
}
