
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { WorkOrderService } from '../WorkOrderService';
import { WorkOrderRepository } from '../WorkOrderRepository';
import { WorkOrder, WorkOrderFormValues } from '@/types/workOrder';

// Mock the repository
jest.mock('../WorkOrderRepository');

describe('WorkOrderService', () => {
  let service: WorkOrderService;
  let mockRepository: jest.Mocked<WorkOrderRepository>;

  const mockWorkOrder: WorkOrder = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    customer_id: '123e4567-e89b-12d3-a456-426614174001',
    description: 'Test work order',
    status: 'pending',
    priority: 'medium',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    customer_name: 'John Doe',
    customer_first_name: 'John',
    customer_last_name: 'Doe',
  };

  const mockFormData: WorkOrderFormValues = {
    customer: 'John Doe',
    description: 'Test work order',
    status: 'pending',
    priority: 'medium',
    technician: 'Tech 1',
    location: '',
    dueDate: '',
    notes: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    licensePlate: '',
    vin: '',
    odometer: '',
    inventoryItems: [],
  };

  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
    
    // Create service instance
    service = new WorkOrderService();
    
    // Get the mocked repository instance
    mockRepository = (service as any).repository as jest.Mocked<WorkOrderRepository>;
  });

  describe('getAllWorkOrders', () => {
    it('should return work orders from repository', async () => {
      const expectedWorkOrders = [mockWorkOrder];
      mockRepository.findAll.mockResolvedValue(expectedWorkOrders);

      const result = await service.getAllWorkOrders();

      expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expectedWorkOrders);
    });

    it('should handle repository errors', async () => {
      const error = new Error('Repository error');
      mockRepository.findAll.mockRejectedValue(error);

      await expect(service.getAllWorkOrders()).rejects.toThrow('Repository error');
    });
  });

  describe('getWorkOrderById', () => {
    it('should return work order when found', async () => {
      mockRepository.findById.mockResolvedValue(mockWorkOrder);

      const result = await service.getWorkOrderById('123');

      expect(mockRepository.findById).toHaveBeenCalledWith('123');
      expect(result).toEqual(mockWorkOrder);
    });

    it('should throw error when work order not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getWorkOrderById('123')).rejects.toThrow('Work order with ID 123 not found');
    });
  });

  describe('createWorkOrder', () => {
    it('should create work order with form data', async () => {
      mockRepository.create.mockResolvedValue(mockWorkOrder);

      const result = await service.createWorkOrder(mockFormData);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: mockFormData.description,
          status: mockFormData.status,
          priority: mockFormData.priority,
        })
      );
      expect(result).toEqual(mockWorkOrder);
    });
  });

  describe('updateWorkOrderStatus', () => {
    it('should update work order status', async () => {
      mockRepository.updateStatus.mockResolvedValue(mockWorkOrder);

      const result = await service.updateWorkOrderStatus('123', 'completed', 'user1', 'John');

      expect(mockRepository.updateStatus).toHaveBeenCalledWith('123', 'completed', 'user1', 'John');
      expect(result).toEqual(mockWorkOrder);
    });
  });
});
