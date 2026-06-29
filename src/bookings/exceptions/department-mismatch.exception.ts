import { HttpStatus } from '@nestjs/common';
import { Department } from '../../common/enums/department.enum';
import { DomainException } from '../../common/exceptions/domain.exception';

export class DepartmentMismatchException extends DomainException {
  constructor(requestDepartment: Department, roomDepartment: Department) {
    super(
      `Department mismatch: request has ${requestDepartment}, room requires ${roomDepartment}`,
      HttpStatus.UNPROCESSABLE_ENTITY,
      'DEPARTMENT_MISMATCH',
      { requestDepartment, roomDepartment },
    );
    this.name = 'DepartmentMismatchException';
  }
}
