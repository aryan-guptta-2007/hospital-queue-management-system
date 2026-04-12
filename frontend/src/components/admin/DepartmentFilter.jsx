const DepartmentFilter = ({ departments, selected, onChange }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
    <label htmlFor="dept-filter" className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap">
      Department
    </label>
    <select
      id="dept-filter"
      value={selected}
      onChange={(e) => onChange(e.target.value)}
      className="select-field py-2.5 text-sm font-semibold max-w-full sm:max-w-xs"
    >
      {departments.map((d) => (
        <option key={d._id} value={d._id}>
          {d.name} ({d.code})
        </option>
      ))}
    </select>
  </div>
)

export default DepartmentFilter
